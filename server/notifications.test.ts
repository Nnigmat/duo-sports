import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { addComment } from './comments';
import { openDb, type Db } from './db';
import { dismissNotification, markNotificationRead, reviewNoticeOf, unreadCount } from './notifications';
import { markReviewed } from './reviews';
import { linkAthlete } from './trainerLinks';

let db: Db;
let athlete: number;
let trainer: number;
const V = '11111111-1111-4111-8111-111111111111';
const at = (iso: string) => () => new Date(iso);
const T = () => ({ id: trainer, role: 'trainer' as const });

const session = (title: string, date: string) =>
  Number(
    db
      .prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, ?, ?, ?, ?, 1)")
      .run(athlete, title, date, `${date}T18:00:00Z`, JSON.stringify([{ exerciseName: 'Приседания со штангой' }])).lastInsertRowid,
  );

beforeEach(async () => {
  db = openDb(':memory:');
  athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete');
  trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer');
  linkAthlete(db, trainer, athlete);
});

describe('уведомление о разборе', () => {
  it('отметка «разобрана» создаёт уведомление один раз', () => {
    const s = session('Ноги', '2026-10-31');
    expect(unreadCount(db, athlete)).toBe(0);
    markReviewed(db, T(), s, at('2026-11-01T19:40:00Z'));
    markReviewed(db, T(), s, at('2026-11-01T20:00:00Z'));
    expect(unreadCount(db, athlete)).toBe(1);
    expect(unreadCount(db, trainer)).toBe(0);
  });
  it('отказ в отметке уведомления не создаёт', () => {
    const s = session('Ноги', '2026-10-31');
    markReviewed(db, { id: athlete, role: 'athlete' }, s);
    expect(unreadCount(db, athlete)).toBe(0);
  });
});

describe('reviewNoticeOf: карточка на «Сегодня»', () => {
  const setup = () => {
    const s = session('Ноги и ягодицы', '2026-10-31');
    db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, session_id, step_index, created_at) VALUES (?, ?, 'x.webm', 38, ?, 0, '2026-10-31T17:00:00Z')").run(V, athlete, s);
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 9, text: 'Глубина отличная' }, at('2026-11-01T19:30:00Z'));
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 21, text: 'Колени внутрь' }, at('2026-11-01T19:31:00Z'));
    addComment(db, T(), athlete, { sessionId: s, text: 'Хорошая работа' }, at('2026-11-01T19:32:00Z'));
    addComment(db, { id: athlete, role: 'athlete' }, athlete, { sessionId: s, text: 'Спасибо' }, at('2026-11-01T19:35:00Z'));
    markReviewed(db, T(), s, at('2026-11-01T19:40:00Z'));
    return s;
  };
  it('нет разборов — null', () => {
    expect(reviewNoticeOf(db, athlete)).toBeNull();
  });
  it('название, время разбора, счётчики и последний комментарий к видео; ответы ученика не считаются', () => {
    const s = setup();
    const n = reviewNoticeOf(db, athlete)!;
    expect(n).toMatchObject({ sessionId: s, title: 'Ноги и ягодицы', reviewedAt: '2026-11-01T19:40:00.000Z', commentCount: 3, videoCommentCount: 2 });
    expect(n.preview).toEqual({ exerciseName: 'Приседания со штангой', timecodeSec: 21, text: 'Колени внутрь' });
  });
  it('разбор без комментариев: карточка есть, preview нет', () => {
    const s = session('Верх', '2026-11-02');
    markReviewed(db, T(), s, at('2026-11-03T10:00:00Z'));
    expect(reviewNoticeOf(db, athlete)).toMatchObject({ sessionId: s, commentCount: 0, videoCommentCount: 0, preview: null });
  });
  it('показывается самый свежий разбор', () => {
    const a = session('Старая', '2026-10-20');
    const b = session('Новая', '2026-10-25');
    markReviewed(db, T(), b, at('2026-10-26T10:00:00Z'));
    markReviewed(db, T(), a, at('2026-10-27T10:00:00Z'));
    expect(reviewNoticeOf(db, athlete)!.title).toBe('Старая');
  });
});

describe('прочитано и скрыто', () => {
  const notified = () => {
    const s = session('Ноги', '2026-10-31');
    markReviewed(db, T(), s, at('2026-11-01T19:40:00Z'));
    return (db.prepare('SELECT id FROM notifications WHERE user_id = ?').get(athlete) as { id: number }).id;
  };
  it('открытие разбора гасит точку, но карточка остаётся', () => {
    const id = notified();
    expect(markNotificationRead(db, athlete, id)).toBe(true);
    expect(unreadCount(db, athlete)).toBe(0);
    expect(reviewNoticeOf(db, athlete)).not.toBeNull();
  });
  it('«Скрыть» убирает карточку и точку', () => {
    const id = notified();
    expect(dismissNotification(db, athlete, id)).toBe(true);
    expect(reviewNoticeOf(db, athlete)).toBeNull();
    expect(unreadCount(db, athlete)).toBe(0);
  });
  it('новый разбор после скрытого снова показывает карточку', () => {
    dismissNotification(db, athlete, notified());
    const s = session('Верх', '2026-11-02');
    markReviewed(db, T(), s, at('2026-11-03T10:00:00Z'));
    expect(reviewNoticeOf(db, athlete)!.title).toBe('Верх');
    expect(unreadCount(db, athlete)).toBe(1);
  });
  it('чужое и несуществующее уведомление не трогается', async () => {
    const id = notified();
    expect(markNotificationRead(db, trainer, id)).toBe(false);
    expect(dismissNotification(db, trainer, id)).toBe(false);
    expect(dismissNotification(db, athlete, 999)).toBe(false);
    expect(unreadCount(db, athlete)).toBe(1);
  });
});
