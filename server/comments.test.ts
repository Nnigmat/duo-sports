import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Block } from '../shared/types';
import { createUser } from './auth';
import { addComment, commentRowsOf, deleteComment, commentsFor, equipmentFor, libraryOf, techniqueOf, techniquesFor, validateComment, type LibraryRow } from './comments';
import { openDb, type Db } from './db';
import { applyImport, ensureLibrary } from './imports';
import { sessionReviewOf } from './sessionReview';
import { linkAthlete } from './trainerLinks';
import { saveSession, workoutResponse } from './workouts';

const V = '11111111-1111-4111-8111-111111111111';
const clock = () => new Date('2026-11-03T10:00:00Z');
const blocks: Block[] = [
  { id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [
    { id: 'b1-e0', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 },
    { id: 'b1-e1', name: 'Планка', kind: 'time', target: { min: 30, max: 30 }, sets: 2 },
  ] },
];
const lib: LibraryRow[] = [
  { slug: 'bench', name: 'Жим лёжа', aliases: ['жим штанги'], notes: '1. Лопатки сведены\n- Гриф к груди', demo: { female: 'f.mp4', male: 'm.mp4' } },
  { slug: 'plank', name: 'Планка', aliases: [], notes: null, demo: {} },
];

describe('техника', () => {
  it('режет заметку на шаги без нумерации', () => {
    expect(techniqueOf('1. Раз\n\n- Два\n3) Три', undefined)).toEqual({ instructions: ['Раз', 'Два', 'Три'] });
  });
  it('без текста и видео техники нет', () => {
    expect(techniqueOf(null, undefined)).toBeNull();
    expect(techniqueOf('  \n', undefined)).toBeNull();
  });
  it('ролик без текста — тоже техника, demoUrl ведёт на раздачу', () => {
    expect(techniqueOf(null, 'a.mp4')).toEqual({ instructions: [], demoUrl: '/api/demo/a.mp4' });
  });
  it('techniquesFor выбирает ролик по полу', () => {
    expect(techniquesFor(blocks, lib, 'male')['b1-e0']).toMatchObject({ demoUrl: '/api/demo/m.mp4' });
    expect(techniquesFor(blocks, lib, 'female')['b1-e0']).toMatchObject({ demoUrl: '/api/demo/f.mp4' });
    expect(techniquesFor(blocks, lib)['b1-e0']).toMatchObject({ demoUrl: '/api/demo/f.mp4' });
  });
  it('привязывает к id из структуры по названию и псевдониму', () => {
    expect(Object.keys(techniquesFor(blocks, lib))).toEqual(['b1-e0']);
    const alias = [{ ...blocks[0]!, exercises: [{ ...blocks[0]!.exercises[0]!, name: 'Жим штанги' }] }] as Block[];
    expect(techniquesFor(alias, lib)['b1-e0']?.instructions).toEqual(['Лопатки сведены', 'Гриф к груди']);
  });
});

describe('инвентарь для экрана', () => {
  it('по id из структуры; без снаряда записи нет', () => {
    const withGear = lib.map((l) => (l.slug === 'bench' ? { ...l, equipment: ['Штанга', 'Скамья'] } : l));
    expect(equipmentFor(blocks, withGear)).toEqual({ 'b1-e0': ['Штанга', 'Скамья'] });
    expect(equipmentFor(blocks, lib)).toEqual({});
  });
});

describe('комментарии для экрана', () => {
  const row = (id: number, slug: string | null, over = {}) => ({ id, exerciseSlug: slug, exerciseName: 'X', videoId: null, videoLabel: null, sessionId: null, text: 't', createdAt: '2026-11-01T00:00:00Z', seen: false, ...over });
  it('подставляет id упражнения из структуры, общие (без упражнения) отбрасывает, чужие упражнения отбрасывает', () => {
    const out = commentsFor(blocks, lib, [row(1, 'bench'), row(2, null), row(3, 'squat')]);
    expect(out.map((c) => [c.id, c.exerciseId])).toEqual([['1', 'b1-e0']]);
  });
  it('видео и признак новизны', () => {
    const [c] = commentsFor(blocks, lib, [row(1, 'plank', { videoId: 'v1', videoLabel: 'Видео · круг 2', seen: true })]);
    expect(c).toMatchObject({ isNew: false, video: { id: 'v1', label: 'Видео · круг 2' } });
  });
});

describe('проверка тела', () => {
  it('принимает текст, режет пробелы', () => {
    expect(validateComment({ text: ' Хорошо ', exerciseId: 'bench' })).toEqual({ ok: true, comment: { exerciseId: 'bench', text: 'Хорошо' } });
  });
  it('цель: упражнение, тренировка или видео; таймкод только у видео', () => {
    expect(validateComment({ text: 'a', sessionId: 4 }).ok).toBe(true);
    expect(validateComment({ text: 'a', videoId: V, timecodeSec: 18 })).toMatchObject({ ok: true, comment: { videoId: V, timecodeSec: 18 } });
    expect(validateComment({ text: 'a', exerciseId: 'bench', timecodeSec: 18 }).ok).toBe(false);
    for (const t of [-1, 1.5, 3601, '5']) expect(validateComment({ text: 'a', videoId: V, timecodeSec: t }).ok).toBe(false);
    for (const sid of [0, -1, 1.5, '4']) expect(validateComment({ text: 'a', sessionId: sid }).ok).toBe(false);
  });
  it('отвергает пустое, длинное и кривое', () => {
    expect(validateComment({ text: '  ' }).ok).toBe(false);
    expect(validateComment({ text: 'a'.repeat(1001) }).ok).toBe(false);
    expect(validateComment({ text: 'a', exerciseId: 5 }).ok).toBe(false);
    expect(validateComment({ text: 'a' }).ok).toBe(false);
    expect(validateComment({ text: 'a', exerciseId: null }).ok).toBe(false);
    expect(validateComment({ text: 'a', videoLabel: 'x' }).ok).toBe(false);
    expect(validateComment(null).ok).toBe(false);
  });
});

describe('база', () => {
  let db: Db;
  let athlete: number;
  let stranger: number;
  let trainer: number;
  let otherTrainer: number;
  beforeEach(async () => {
    db = openDb(':memory:');
    athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete', clock);
    stranger = await createUser(db, 's@example.com', 'trenirovka7', 'athlete', clock);
    trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer', clock);
    otherTrainer = await createUser(db, 't2@example.com', 'trenirovka7', 'trainer', clock);
    linkAthlete(db, trainer, athlete);
    applyImport(db, trainer, {
      exercises: [{ id: 'bench', name: 'Жим лёжа', aliases: [], muscles: [], kind: 'weight', group: 'chest', notes: '1. Лопатки сведены' }],
      workouts: [{ title: 'Служебная', blocks: [] }],
      entries: [],
      replaceDates: [], routines: [],
    }, clock);
    applyImport(db, athlete, {
      exercises: [],
      workouts: [{ id: 'w1', title: 'Верх', blocks: [], structure: blocks }],
      entries: [],
      replaceDates: [], routines: [],
    }, clock);
  });
  const wid = () => (db.prepare('SELECT id FROM workouts WHERE user_id = ?').get(athlete) as { id: number }).id;
  const asTrainer = () => ({ id: trainer, role: 'trainer' as const });
  const asAthlete = () => ({ id: athlete, role: 'athlete' as const });
  /** Тренировка спортсмена с видео первого подхода */
  const sessionWithVideo = () => {
    db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, created_at) VALUES (?, ?, ?, 38, '2026-11-03T09:00:00Z')").run(V, athlete, `${V}.webm`);
    const r = saveSession(db, athlete, wid(), {
      date: '2026-11-03', videos: 1,
      steps: [{ exerciseId: 'b1-e0', exerciseName: 'Жим лёжа', blockIndex: 0, round: 1, rounds: 3, kind: 'weight', plan: { target: { min: 8, max: 8 }, weight: 60 }, completed: true, videoId: V }],
    }, clock);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  };

  it('тренер пишет к упражнению; неизвестное упражнение и спортсмена отвергает', () => {
    expect(addComment(db, asTrainer(), athlete, { exerciseId: 'bench', text: 'Локти ближе' }, clock).ok).toBe(true);
    expect(addComment(db, asTrainer(), athlete, { exerciseId: 'nope', text: 'a' }, clock)).toEqual({ ok: false, error: 'unknown_exercise' });
    expect(addComment(db, asTrainer(), 999, { exerciseId: 'bench', text: 'a' }, clock)).toEqual({ ok: false, error: 'not_found' });
    expect(commentRowsOf(db, athlete)).toHaveLength(1);
  });
  it('доступ: тренер только к своему ученику, админ ко всем, ученик только о себе', () => {
    const c = { exerciseId: 'bench', text: 'a' };
    expect(addComment(db, { id: otherTrainer, role: 'trainer' }, athlete, c, clock)).toEqual({ ok: false, error: 'forbidden' });
    expect(addComment(db, asTrainer(), stranger, c, clock)).toEqual({ ok: false, error: 'forbidden' });
    expect(addComment(db, { id: trainer, role: 'admin' }, stranger, c, clock).ok).toBe(true);
    expect(addComment(db, asAthlete(), athlete, c, clock).ok).toBe(true);
    expect(addComment(db, asAthlete(), stranger, c, clock)).toEqual({ ok: false, error: 'forbidden' });
  });
  it('ответ тренировки отдаёт ролик по полу владельца тренировки', () => {
    db.prepare("UPDATE exercises SET demo_female = 'f.mp4', demo_male = 'm.mp4' WHERE slug = 'bench'").run();
    expect(workoutResponse(db, athlete, wid(), false)!.techniques['b1-e0']).toMatchObject({ demoUrl: '/api/demo/f.mp4' });
    db.prepare("UPDATE users SET gender = 'male' WHERE id = ?").run(athlete);
    expect(workoutResponse(db, athlete, wid(), false)!.techniques['b1-e0']).toMatchObject({ demoUrl: '/api/demo/m.mp4' });
  });
  it('ответ тренировки содержит комментарии и технику; комментарий к видео привязан к разбору и остаётся «новым»', () => {
    addComment(db, { id: trainer, role: 'admin' }, athlete, { exerciseId: 'bench', text: 'Локти ближе', videoId: V, videoLabel: 'Видео · круг 2' }, clock);
    // видео должно существовать
    expect(commentRowsOf(db, athlete)).toHaveLength(0);
    sessionWithVideo();
    addComment(db, { id: trainer, role: 'admin' }, athlete, { exerciseId: 'bench', text: 'Локти ближе', videoId: V, videoLabel: 'Видео · круг 2' }, clock);
    const first = workoutResponse(db, athlete, wid())!;
    expect(first.comments).toHaveLength(1);
    expect(first.comments[0]).toMatchObject({ exerciseId: 'b1-e0', exerciseName: 'Жим лёжа', isNew: true, video: { id: V } });
    expect(first.techniques['b1-e0']).toEqual({ instructions: ['Лопатки сведены'] });
    // видео привязывает комментарий к тренировке, значит гасит «новое» экран разбора, а не экран тренировки
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(true);
  });
  it('комментарий без привязки к тренировке: «новое» видно один раз', () => {
    addComment(db, asTrainer(), athlete, { exerciseId: 'bench', text: 'Локти ближе' }, clock);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(true);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(false);
  });
  it('превью тренера (markRead: false) не гасит «новое» у ученика', () => {
    addComment(db, asTrainer(), athlete, { exerciseId: 'bench', text: 'Локти ближе' }, clock);
    expect(workoutResponse(db, athlete, wid(), false)!.comments[0]!.isNew).toBe(true);
    expect(workoutResponse(db, athlete, wid(), false)!.comments[0]!.isNew).toBe(true);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(true);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(false);
  });
  it('комментарий из разбора экран тренировки не помечает прочитанным: «новое» доживает до экрана разбора', () => {
    const sid = sessionWithVideo();
    addComment(db, asTrainer(), athlete, { exerciseId: 'bench', sessionId: sid, text: 'Локти ближе' }, clock);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(true);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(true);
    const review = (r = sessionReviewOf(db, asAthlete(), sid, '2026-11-04')) => {
      if (!r.ok) throw new Error(r.error);
      return r.review.exercises[0]!;
    };
    expect(review().newCount).toBe(1);
    expect(review().newCount).toBe(0);
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(false);
  });
  it('ответы самого ученика на экран тренировки как комментарии тренера не попадают', () => {
    addComment(db, asAthlete(), athlete, { exerciseId: 'bench', text: 'Тяжело' }, clock);
    expect(workoutResponse(db, athlete, wid())!.comments).toEqual([]);
  });
  it('чужие комментарии не попадают', () => {
    ensureLibrary(db);
    addComment(db, { id: trainer, role: 'admin' }, stranger, { exerciseId: 'bench', text: 'не тебе' }, clock);
    expect(workoutResponse(db, athlete, wid())!.comments).toEqual([]);
    expect(libraryOf(db).map((e) => e.slug)).toContain('bench');
  });

  it('удаляет автор и админ; чужой комментарий не удаляется', () => {
    const add = (who: { id: number; role: 'trainer' | 'athlete' }) => {
      const r = addComment(db, who, athlete, { exerciseId: 'bench', text: 'a' }, clock);
      if (!r.ok) throw new Error(r.error);
      return r.id;
    };
    const t = add(asTrainer());
    const a = add(asAthlete());
    expect(deleteComment(db, asAthlete(), athlete, t)).toEqual({ ok: false, error: 'forbidden' });
    expect(deleteComment(db, asTrainer(), athlete, a)).toEqual({ ok: false, error: 'forbidden' });
    expect(deleteComment(db, { id: stranger, role: 'athlete' }, athlete, a)).toEqual({ ok: false, error: 'forbidden' });
    expect(deleteComment(db, asTrainer(), athlete, t)).toEqual({ ok: true });
    expect(deleteComment(db, asTrainer(), athlete, t)).toEqual({ ok: false, error: 'not_found' });
    expect(deleteComment(db, { id: 1, role: 'admin' }, athlete, a)).toEqual({ ok: true });
  });

  describe('цели: тренировка и видео', () => {
    it('к тренировке целиком: подпись — название тренировки; чужая и несуществующая отвергаются', () => {
      const sid = sessionWithVideo();
      const r = addComment(db, asTrainer(), athlete, { sessionId: sid, text: 'Хорошая работа' }, clock);
      expect(r.ok).toBe(true);
      expect(db.prepare('SELECT session_id, exercise_slug, exercise_name, video_id, timecode_sec FROM comments').get()).toEqual({ session_id: sid, exercise_slug: null, exercise_name: 'Верх', video_id: null, timecode_sec: null });
      expect(addComment(db, asTrainer(), athlete, { sessionId: sid + 1, text: 'a' }, clock)).toEqual({ ok: false, error: 'unknown_session' });
      expect(addComment(db, { id: trainer, role: 'admin' }, stranger, { sessionId: sid, text: 'a' }, clock)).toEqual({ ok: false, error: 'unknown_session' });
    });
    it('к видео с таймкодом: сессия и упражнение берутся из видео', () => {
      const sid = sessionWithVideo();
      expect(addComment(db, asTrainer(), athlete, { videoId: V, timecodeSec: 21, text: 'Колени внутрь' }, clock).ok).toBe(true);
      expect(db.prepare('SELECT session_id, exercise_name, video_id, timecode_sec FROM comments').get()).toEqual({ session_id: sid, exercise_name: 'Жим лёжа', video_id: V, timecode_sec: 21 });
    });
    it('чужое и неизвестное видео отвергается', () => {
      db.prepare("INSERT INTO videos (id, athlete_id, file, duration_sec, created_at) VALUES (?, ?, 'x.webm', 5, '2026-11-03T09:00:00Z')").run(V, stranger);
      expect(addComment(db, asTrainer(), athlete, { videoId: V, text: 'a' }, clock)).toEqual({ ok: false, error: 'unknown_video' });
      expect(addComment(db, asTrainer(), athlete, { videoId: '33333333-3333-4333-8333-333333333333', text: 'a' }, clock)).toEqual({ ok: false, error: 'unknown_video' });
    });
  });
});

describe('миграция coach_comments → comments', () => {
  it('старая таблица переименована, строки целы, новые поля пусты', () => {
    const file = `${process.env.TMPDIR ?? '/tmp'}/old-comments-${Date.now()}.db`;
    const old = new Database(file);
    old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL, password_changed_at TEXT, created_at TEXT NOT NULL);
      INSERT INTO users (email, password_hash, role, created_at) VALUES ('a@b.c', 'x', 'athlete', 'now'), ('t@b.c', 'x', 'trainer', 'now');
      CREATE TABLE coach_comments (id INTEGER PRIMARY KEY, athlete_id INTEGER NOT NULL, author_id INTEGER NOT NULL, exercise_slug TEXT, exercise_name TEXT NOT NULL, video_id TEXT, video_label TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL, seen_at TEXT);
      INSERT INTO coach_comments (athlete_id, author_id, exercise_slug, exercise_name, text, created_at) VALUES (1, 2, 'bench', 'Жим', 'Локти ближе', 'now');`);
    old.close();
    const migrated = openDb(file);
    expect(migrated.prepare("SELECT name FROM sqlite_master WHERE name = 'coach_comments'").get()).toBeUndefined();
    expect(migrated.prepare('SELECT text, session_id, timecode_sec FROM comments').get()).toEqual({ text: 'Локти ближе', session_id: null, timecode_sec: null });
    migrated.close();
    expect(openDb(file).prepare('SELECT COUNT(*) AS n FROM comments').get()).toEqual({ n: 1 });
  });
});
