import { beforeEach, describe, expect, it } from 'vitest';
import type { Block } from '../shared/types';
import { createUser } from './auth';
import { addComment, commentRowsOf, commentsFor, libraryOf, techniqueOf, techniquesFor, validateComment, type LibraryRow } from './comments';
import { openDb, type Db } from './db';
import { applyImport, ensureLibrary } from './imports';
import { workoutResponse } from './workouts';

const clock = () => new Date('2026-11-03T10:00:00Z');
const blocks: Block[] = [
  { id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [
    { id: 'b1-e0', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 },
    { id: 'b1-e1', name: 'Планка', kind: 'time', target: { min: 30, max: 30 }, sets: 2 },
  ] },
];
const lib: LibraryRow[] = [
  { slug: 'bench', name: 'Жим лёжа', aliases: ['жим штанги'], notes: '1. Лопатки сведены\n- Гриф к груди', videoUrl: '/v/bench.mp4' },
  { slug: 'plank', name: 'Планка', aliases: [], notes: null, videoUrl: null },
];

describe('техника', () => {
  it('режет заметку на шаги без нумерации', () => {
    expect(techniqueOf('1. Раз\n\n- Два\n3) Три', null)).toEqual({ instructions: ['Раз', 'Два', 'Три'] });
  });
  it('без текста и видео техники нет', () => {
    expect(techniqueOf(null, null)).toBeNull();
    expect(techniqueOf('  \n', null)).toBeNull();
  });
  it('видео без текста — тоже техника', () => {
    expect(techniqueOf(null, 'a.mp4')).toEqual({ instructions: [], videoUrl: 'a.mp4' });
  });
  it('привязывает к id из структуры по названию и псевдониму', () => {
    expect(Object.keys(techniquesFor(blocks, lib))).toEqual(['b1-e0']);
    const alias = [{ ...blocks[0]!, exercises: [{ ...blocks[0]!.exercises[0]!, name: 'Жим штанги' }] }] as Block[];
    expect(techniquesFor(alias, lib)['b1-e0']?.instructions).toEqual(['Лопатки сведены', 'Гриф к груди']);
  });
});

describe('комментарии для экрана', () => {
  const row = (id: number, slug: string | null, over = {}) => ({ id, exerciseSlug: slug, exerciseName: 'X', videoId: null, videoLabel: null, text: 't', createdAt: '2026-11-01T00:00:00Z', seen: false, ...over });
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
    expect(validateComment({ text: ' Хорошо ', exerciseId: 'bench' })).toEqual({ ok: true, comment: { exerciseId: 'bench', text: 'Хорошо', videoId: undefined, videoLabel: undefined } });
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
  let trainer: number;
  beforeEach(async () => {
    db = openDb(':memory:');
    athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete', clock);
    trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer', clock);
    applyImport(db, trainer, {
      exercises: [{ id: 'bench', name: 'Жим лёжа', aliases: [], muscles: [], kind: 'weight', group: 'chest', notes: '1. Лопатки сведены', video: '/v/b.mp4' }],
      workouts: [{ title: 'Служебная', blocks: [] }],
      entries: [],
      replaceDates: [],
    }, clock);
    applyImport(db, athlete, {
      exercises: [],
      workouts: [{ id: 'w1', title: 'Верх', blocks: [], structure: blocks }],
      entries: [],
      replaceDates: [],
    }, clock);
  });
  const wid = () => (db.prepare('SELECT id FROM workouts WHERE user_id = ?').get(athlete) as { id: number }).id;

  it('атлет не пишет комментарии', () => {
    expect(addComment(db, { id: athlete, role: 'athlete' }, athlete, { exerciseId: 'bench', text: 'a' }, clock)).toEqual({ ok: false, error: 'forbidden' });
  });
  it('тренер пишет к упражнению; без упражнения, неизвестное упражнение и спортсмена отвергает', () => {
    const t = { id: trainer, role: 'trainer' as const };
    expect(addComment(db, t, athlete, { exerciseId: 'bench', text: 'Локти ближе' }, clock).ok).toBe(true);
    expect(addComment(db, t, athlete, { exerciseId: 'nope', text: 'a' }, clock)).toEqual({ ok: false, error: 'unknown_exercise' });
    expect(addComment(db, t, 999, { exerciseId: 'bench', text: 'a' }, clock)).toEqual({ ok: false, error: 'not_found' });
    expect(commentRowsOf(db, athlete)).toHaveLength(1);
  });
  it('ответ тренировки содержит комментарии и технику; «новое» видно один раз', () => {
    addComment(db, { id: trainer, role: 'admin' }, athlete, { exerciseId: 'bench', text: 'Локти ближе', videoId: 'v1', videoLabel: 'Видео · круг 2' }, clock);
    const first = workoutResponse(db, athlete, wid())!;
    expect(first.comments).toHaveLength(1);
    expect(first.comments[0]).toMatchObject({ exerciseId: 'b1-e0', exerciseName: 'Жим лёжа', isNew: true, video: { id: 'v1' } });
    expect(first.techniques['b1-e0']).toEqual({ instructions: ['Лопатки сведены'], videoUrl: '/v/b.mp4' });
    expect(workoutResponse(db, athlete, wid())!.comments[0]!.isNew).toBe(false);
  });
  it('чужие комментарии не попадают', () => {
    ensureLibrary(db);
    expect(addComment(db, { id: trainer, role: 'trainer' }, trainer, { exerciseId: 'bench', text: 'себе' }, clock).ok).toBe(true);
    expect(workoutResponse(db, athlete, wid())!.comments).toEqual([]);
    expect(libraryOf(db).map((e) => e.slug)).toContain('bench');
  });
});
