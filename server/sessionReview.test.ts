import { beforeEach, describe, expect, it } from 'vitest';
import type { SessionStepResult } from '../shared/types';
import { createUser } from './auth';
import { addComment } from './comments';
import { openDb, type Db } from './db';
import { markReviewed } from './reviews';
import { actualLabel, awaitingReviewOf, setLabel, sessionReviewOf, videoReviewOf } from './sessionReview';
import { linkAthlete } from './trainerLinks';

let db: Db;
let athlete: number;
let trainer: number;
let stranger: number;
const V = '11111111-1111-4111-8111-111111111111';
const at = (iso: string) => () => new Date(iso);
const T = () => ({ id: trainer, role: 'trainer' as const });
const A = () => ({ id: athlete, role: 'athlete' as const });
const NB = '\u00a0';

const step = (over: Partial<SessionStepResult>): SessionStepResult => ({ exerciseId: 'e0', exerciseName: 'Приседания со штангой', blockIndex: 1, round: 1, rounds: 4, kind: 'weight', plan: { target: { min: 5, max: 5 }, weight: 80 }, completed: true, ...over });

let sid: number;
beforeEach(async () => {
  db = openDb(':memory:');
  athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete');
  trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer');
  stranger = await createUser(db, 's@example.com', 'trenirovka7', 'athlete');
  linkAthlete(db, trainer, athlete);
  db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('squat', 'Приседания со штангой', 'weight', 'legs', 'x'), ('rdl', 'Румынская тяга', 'weight', 'legs', 'x')").run();
  const steps = [step({ round: 1 }), step({ round: 2 }), step({ round: 3, completed: false }), step({ round: 4, videoId: V }), step({ exerciseId: 'e1', exerciseName: 'Румынская тяга', rounds: 1, plan: { target: { min: 10, max: 10 }, weight: 50 } })];
  sid = Number(db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos, duration_sec) VALUES (?, 'Ноги', '2026-10-31', '2026-10-31T18:00:00Z', ?, 1, 2880)").run(athlete, JSON.stringify(steps)).lastInsertRowid);
  db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, session_id, step_index, created_at) VALUES (?, ?, 'x.webm', 38, ?, 3, '2026-10-31T17:00:00Z')").run(V, athlete, sid);
});

describe('actualLabel', () => {
  it('по факту; без факта по плану', () => {
    expect(actualLabel(step({ actual: { value: 7, weight: 85 } }))).toBe(`85${NB}кг × 7`);
    expect(actualLabel(step({ kind: 'reps', plan: { target: { min: 18, max: 20 } }, actual: { value: 22 } }))).toBe(`22${NB}повт`);
    expect(actualLabel(step({ kind: 'time', plan: { target: { min: 90, max: 90 } }, actual: { value: 95 } }))).toBe('1:35');
    expect(actualLabel(step({}))).toBe(`80${NB}кг × 5`);
  });
});

describe('setLabel', () => {
  it('вес × повторы, повторы, время; диапазон и запятая', () => {
    expect(setLabel(step({}))).toBe(`80${NB}кг × 5`);
    expect(setLabel(step({ plan: { target: { min: 8, max: 10 }, weight: 62.5 } }))).toBe(`62,5${NB}кг × 8–10`);
    expect(setLabel(step({ kind: 'reps', plan: { target: { min: 18, max: 20 } } }))).toBe(`18–20${NB}повт`);
    expect(setLabel(step({ kind: 'time', plan: { target: { min: 90, max: 90 } } }))).toBe('1:30');
    expect(setLabel(step({ plan: { target: { min: 5, max: 5 } } }))).toBe(`5${NB}повт`);
  });
});

describe('sessionReviewOf', () => {
  const view = (viewer: { id: number; role: 'athlete' | 'trainer' } = A(), date = '2026-11-02') => {
    const r = sessionReviewOf(db, viewer, sid, date);
    if (!r.ok) throw new Error(r.error);
    return r.review;
  };
  it('шапка и подходы по упражнениям, видео у своего подхода', () => {
    const r = view();
    expect(r).toMatchObject({ sessionId: sid, athleteId: athlete, title: 'Ноги', date: '2026-10-31', durationSec: 2880, volumeKg: 80 * 5 * 3 + 50 * 10, reviewedAt: null, trainerCommentCount: 0, hints: null });
    expect(r.exercises.map((e) => [e.name, e.sets.length])).toEqual([['Приседания со штангой', 4], ['Румынская тяга', 1]]);
    expect(r.exercises.map((e) => e.slug)).toEqual(['squat', 'rdl']);
    expect(r.exercises[0]!.sets[3]).toEqual({ n: 4, label: `80${NB}кг × 5`, completed: true, videoId: V, videoDurationSec: 38 });
    expect(r.exercises[0]!.sets[2]!.completed).toBe(false);
  });
  it('факт и метка у подхода с фактом; пропущенный и старый подход без них', () => {
    const steps = [
      step({ round: 1, actual: { value: 7, weight: 85, extraWeight: true } }),
      step({ round: 2, actual: { value: 4, weight: 80 } }),
      step({ round: 3, actual: { value: 5, weight: 80 } }),
      step({ round: 4, completed: false }),
      step({ round: 5 }),
    ];
    const id = Number(db.prepare("INSERT INTO sessions_done (user_id, workout_id, title, date, steps, videos, finished_at) SELECT user_id, workout_id, title, date, ?, 0, finished_at FROM sessions_done WHERE id = ?").run(JSON.stringify(steps), sid).lastInsertRowid);
    const r = sessionReviewOf(db, A(), id, '2026-11-02');
    if (!r.ok) throw new Error(r.error);
    const sets = r.review.exercises[0]!.sets;
    expect(sets[0]).toMatchObject({ label: `80${NB}кг × 5`, actualLabel: `85${NB}кг × 7`, factMark: 'Больше плана', extraWeight: true });
    expect(sets[1]).toMatchObject({ actualLabel: `80${NB}кг × 4`, factMark: 'Меньше плана' });
    expect(sets[2]).toMatchObject({ factMark: 'В плане' });
    expect(sets[2]).not.toHaveProperty('extraWeight');
    expect(sets[3]).toEqual({ n: 4, label: `80${NB}кг × 5`, completed: false });
    expect(sets[4]).toEqual({ n: 5, label: `80${NB}кг × 5`, completed: true });
  });
  it('комментарии раскладываются: к видео и упражнению по группам, общие отдельно, чужие упражнения нет', () => {
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 21, text: 'Колени внутрь' }, at('2026-11-01T19:31:00Z'));
    addComment(db, T(), athlete, { exerciseId: 'rdl', text: 'Спина ровная' }, at('2026-11-01T19:32:00Z'));
    addComment(db, T(), athlete, { sessionId: sid, text: 'Хорошая работа' }, at('2026-11-01T19:33:00Z'));
    addComment(db, T(), athlete, { exerciseId: 'squat', text: 'Без привязки к этой тренировке' }, at('2026-11-01T19:34:00Z'));
    const r = view();
    expect(r.exercises[0]!.thread.map((c) => [c.text, c.timecodeSec, c.videoId])).toEqual([['Колени внутрь', 21, V]]);
    expect(r.exercises[1]!.thread.map((c) => c.text)).toEqual([]);
    expect(r.general.map((c) => c.text)).toEqual(['Хорошая работа']);
  });
  it('комментарий к упражнению через sessionId попадает в группу по названию', () => {
    addComment(db, T(), athlete, { exerciseId: 'rdl', sessionId: sid, text: 'Спина ровная' }, at('2026-11-01T19:32:00Z'));
    expect(view().exercises[1]!.thread.map((c) => c.text)).toEqual(['Спина ровная']);
  });
  it('заметка ученика до разбора — «Ты написал», после разбора — ответ в ветке', () => {
    addComment(db, A(), athlete, { exerciseId: 'squat', sessionId: sid, text: 'Последний повтор тяжело' }, at('2026-10-31T18:05:00Z'));
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 9, text: 'Глубина отличная' }, at('2026-11-01T19:30:00Z'));
    markReviewed(db, T(), sid, at('2026-11-01T19:40:00Z'));
    addComment(db, A(), athlete, { exerciseId: 'squat', sessionId: sid, text: 'Понял, попробую с паузой' }, at('2026-11-02T08:00:00Z'));
    const r = view();
    expect(r.reviewedAt).toBe('2026-11-01T19:40:00.000Z');
    expect(r.trainerCommentCount).toBe(1);
    expect(r.exercises[0]!.note).toBe('Последний повтор тяжело');
    expect(r.exercises[0]!.thread.map((c) => [c.author, c.text])).toEqual([['trainer', 'Глубина отличная'], ['athlete', 'Понял, попробую с паузой']]);
  });
  it('«новое»: чужие непрочитанные, и открытие помечает их прочитанными', () => {
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 9, text: 'Глубина отличная' }, at('2026-11-01T19:30:00Z'));
    markReviewed(db, T(), sid, at('2026-11-01T19:40:00Z'));
    addComment(db, A(), athlete, { exerciseId: 'squat', sessionId: sid, text: 'Спасибо' }, at('2026-11-02T08:00:00Z'));
    const first = view();
    expect(first.exercises[0]!.newCount).toBe(1);
    expect(first.exercises[0]!.thread.map((c) => c.isNew)).toEqual([true, false]);
    expect(view().exercises[0]!.newCount).toBe(0);
    // ответ ученика тренер увидит новым
    expect(view(T()).exercises[0]!.thread.map((c) => c.isNew)).toEqual([false, true]);
  });
  it('открытие разбора гасит уведомление, остальные не трогает', () => {
    markReviewed(db, T(), sid, at('2026-11-01T19:40:00Z'));
    expect(db.prepare('SELECT read_at FROM notifications').get()).toEqual({ read_at: null });
    view();
    expect((db.prepare('SELECT read_at FROM notifications').get() as { read_at: string | null }).read_at).not.toBeNull();
  });
  it('подсказки к следующей тренировке видит только спортсмен', () => {
    db.prepare("INSERT INTO workouts (user_id, title, blocks, created_at) VALUES (?, 'Ноги', '[]', 'x')").run(athlete);
    const w = (db.prepare('SELECT id FROM workouts WHERE user_id = ?').get(athlete) as { id: number }).id;
    db.prepare("INSERT INTO plan_entries (user_id, date, workout_id) VALUES (?, '2026-11-05', ?)").run(athlete, w);
    db.prepare("INSERT INTO workout_hints (athlete_id, author_id, workout_id, exercise_slug, exercise_name, text, created_at) VALUES (?, ?, ?, 'squat', 'Приседания со штангой', 'Пауза внизу', '2026-11-01T19:40:00Z')").run(athlete, trainer, w);
    expect(view().hints).toMatchObject({ date: '2026-11-05', hints: [{ text: 'Пауза внизу' }] });
    expect(view(T()).hints).toBeNull();
  });
  it('доступ: чужой тренер и чужой спортсмен — нет, несуществующая — not_found', () => {
    expect(sessionReviewOf(db, { id: stranger, role: 'athlete' }, sid, '2026-11-02')).toEqual({ ok: false, error: 'forbidden' });
    expect(sessionReviewOf(db, { id: trainer + 100, role: 'trainer' }, sid, '2026-11-02')).toEqual({ ok: false, error: 'forbidden' });
    expect(sessionReviewOf(db, A(), 999, '2026-11-02')).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('videoReviewOf', () => {
  it('видео, подпись подхода и комментарии по таймкоду', () => {
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 21, text: 'Колени внутрь' }, at('2026-11-01T19:31:00Z'));
    addComment(db, T(), athlete, { videoId: V, timecodeSec: 9, text: 'Глубина отличная' }, at('2026-11-01T19:30:00Z'));
    const r = videoReviewOf(db, A(), V);
    if (!r.ok) throw new Error(r.error);
    expect(r.review.athleteId).toBe(athlete);
    expect(r.review.video).toEqual({ id: V, durationSec: 38, exerciseName: 'Приседания со штангой', label: `Подход 4 · 80${NB}кг × 5`, sessionId: sid });
    expect(r.review.comments.map((c) => c.timecodeSec)).toEqual([9, 21]);
  });
  it('чужое и неизвестное видео', () => {
    expect(videoReviewOf(db, { id: stranger, role: 'athlete' }, V)).toEqual({ ok: false, error: 'forbidden' });
    expect(videoReviewOf(db, A(), '33333333-3333-4333-8333-333333333333')).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('awaitingReviewOf: «видео отправлены, тренер ещё не посмотрел»', () => {
  it('свежая тренировка с видео без разбора; сегодня/вчера/дата', () => {
    expect(awaitingReviewOf(db, athlete, '2026-11-01')).toEqual({ sessionId: sid, title: 'Ноги', whenLabel: 'вчера', videos: 1 });
    expect(awaitingReviewOf(db, athlete, '2026-10-31')!.whenLabel).toBe('сегодня');
    expect(awaitingReviewOf(db, athlete, '2026-11-05')!.whenLabel).toBe('31 окт');
  });
  it('после разбора, без видео и старше двух недель — нет', () => {
    expect(awaitingReviewOf(db, athlete, '2026-11-20')).toBeNull();
    db.prepare('DELETE FROM videos').run();
    expect(awaitingReviewOf(db, athlete, '2026-11-01')).toBeNull();
    db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, session_id, step_index, created_at) VALUES (?, ?, 'x', 1, ?, 3, 'x')").run(V, athlete, sid);
    markReviewed(db, T(), sid);
    expect(awaitingReviewOf(db, athlete, '2026-11-01')).toBeNull();
  });
});
