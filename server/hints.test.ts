import { beforeEach, describe, expect, it } from 'vitest';
import type { CommitBlock } from '../shared/types';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { addHint, nextWorkoutHints, validateHint } from './hints';
import { applyImport } from './imports';
import { saveSession } from './workouts';
import { linkAthlete } from './trainerLinks';

let db: Db;
let athlete: number;
let trainer: number;
let otherTrainer: number;
const clock = (iso = '2026-11-02T10:00:00Z') => () => new Date(iso);
const blocks: CommitBlock[] = [{ kind: 'exercises', heading: 'Подходами', items: [{ name: 'Приседания со штангой', value: '4 × 5 · 82,5 кг' }, { name: 'Планка', value: '2 × 0:30' }] }];
const T = () => ({ id: trainer, role: 'trainer' as const });
const wid = () => (db.prepare("SELECT id FROM workouts WHERE user_id = ? AND title = 'Ноги'").get(athlete) as { id: number }).id;

beforeEach(async () => {
  db = openDb(':memory:');
  athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete');
  trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer');
  otherTrainer = await createUser(db, 't2@example.com', 'trenirovka7', 'trainer');
  linkAthlete(db, trainer, athlete);
  applyImport(db, trainer, {
    exercises: [
      { id: 'squat', name: 'Приседания со штангой', aliases: [], muscles: [], kind: 'weight', group: 'legs' },
      { id: 'plank', name: 'Планка', aliases: [], muscles: [], kind: 'time', group: 'core' },
    ],
    workouts: [{ title: 'Служебная', blocks: [] }], entries: [], replaceDates: [], routines: [],
  }, clock());
  applyImport(db, athlete, {
    exercises: [],
    workouts: [{ id: 'legs', title: 'Ноги', blocks }],
    entries: [{ date: '2026-11-05', workout: 0 }, { date: '2026-11-12', workout: 0 }],
    replaceDates: [], routines: [],
  }, clock());
});

describe('validateHint', () => {
  it('принимает workoutId, exerciseId и текст', () => {
    expect(validateHint({ workoutId: 3, exerciseId: 'squat', text: ' Пауза внизу ' })).toEqual({ ok: true, hint: { workoutId: 3, exerciseId: 'squat', text: 'Пауза внизу' } });
  });
  it('отвергает пустое, длинное и кривое', () => {
    expect(validateHint({ workoutId: 3, exerciseId: 'squat', text: ' ' }).ok).toBe(false);
    expect(validateHint({ workoutId: 3, exerciseId: 'squat', text: 'a'.repeat(1001) }).ok).toBe(false);
    expect(validateHint({ workoutId: '3', exerciseId: 'squat', text: 'a' }).ok).toBe(false);
    expect(validateHint({ workoutId: 0, exerciseId: 'squat', text: 'a' }).ok).toBe(false);
    expect(validateHint({ workoutId: 3, text: 'a' }).ok).toBe(false);
    expect(validateHint(null).ok).toBe(false);
  });
});

describe('addHint', () => {
  const hint = (over = {}) => ({ workoutId: wid(), exerciseId: 'squat', text: 'Разминочные с паузой внизу', ...over });
  it('тренер своему ученику', () => {
    expect(addHint(db, T(), athlete, hint(), clock()).ok).toBe(true);
  });
  it('отказы: чужой тренер, сам спортсмен, чужая тренировка, неизвестное упражнение и спортсмен', () => {
    expect(addHint(db, { id: otherTrainer, role: 'trainer' }, athlete, hint(), clock())).toEqual({ ok: false, error: 'forbidden' });
    expect(addHint(db, { id: athlete, role: 'athlete' }, athlete, hint(), clock())).toEqual({ ok: false, error: 'forbidden' });
    expect(addHint(db, T(), athlete, hint({ workoutId: 999 }), clock())).toEqual({ ok: false, error: 'unknown_workout' });
    expect(addHint(db, T(), athlete, hint({ exerciseId: 'nope' }), clock())).toEqual({ ok: false, error: 'unknown_exercise' });
    expect(addHint(db, T(), 999, hint(), clock())).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('nextWorkoutHints', () => {
  const add = (exerciseId: string, text: string, at?: string) => addHint(db, T(), athlete, { workoutId: wid(), exerciseId, text }, clock(at));
  it('ближайшая невыполненная тренировка с подсказками, у упражнения подпись из плана', () => {
    add('squat', 'Пауза внизу');
    add('plank', 'Таз не проваливать');
    expect(nextWorkoutHints(db, athlete, '2026-11-02')).toEqual({
      date: '2026-11-05', workoutId: wid(), title: 'Ноги',
      hints: [
        { exerciseName: 'Приседания со штангой', detail: '4 × 5 · 82,5 кг', text: 'Пауза внизу' },
        { exerciseName: 'Планка', detail: '2 × 0:30', text: 'Таз не проваливать' },
      ],
    });
  });
  it('без подсказок и без плана — null; прошедшие дни не берутся', () => {
    expect(nextWorkoutHints(db, athlete, '2026-11-02')).toBeNull();
    add('squat', 'Пауза');
    expect(nextWorkoutHints(db, athlete, '2026-11-06')!.date).toBe('2026-11-12');
    expect(nextWorkoutHints(db, athlete, '2026-11-13')).toBeNull();
  });
  it('после выполнения тренировки подсказка отработана: на следующее занятие она не переходит', () => {
    add('squat', 'Пауза', '2026-11-02T10:00:00Z');
    saveSession(db, athlete, wid(), { date: '2026-11-05', videos: 0, steps: [{ exerciseId: 'x', exerciseName: 'X', blockIndex: 0, round: 1, rounds: 1, kind: 'reps', plan: { target: { min: 1, max: 1 } }, completed: true }] }, clock('2026-11-05T18:00:00Z'));
    expect(nextWorkoutHints(db, athlete, '2026-11-06')).toBeNull();
    add('squat', 'Новая', '2026-11-06T09:00:00Z');
    expect(nextWorkoutHints(db, athlete, '2026-11-06')!.hints.map((h) => h.text)).toEqual(['Новая']);
  });
  it('перенесённая тренировка несёт подсказки на новый день', () => {
    add('squat', 'Пауза');
    db.prepare("UPDATE plan_entries SET date = '2026-11-07' WHERE user_id = ? AND date = '2026-11-05'").run(athlete);
    expect(nextWorkoutHints(db, athlete, '2026-11-02')!.date).toBe('2026-11-07');
  });
});
