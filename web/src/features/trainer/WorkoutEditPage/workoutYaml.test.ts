import { describe, expect, it } from 'vitest';
import type { Block } from '../../../../../shared/types';
import type { LibraryExercise } from '../../exercises/types';
import { workoutFromYaml, workoutToYaml } from './workoutYaml';

const lib = (name: string, kind: LibraryExercise['kind']): LibraryExercise =>
  ({ id: name, name, kind, group: 'legs', muscles: [], equipment: '', defaults: { reps: 8, weight: 0, seconds: 30 }, sessionsTotal: 0, sessions: [], trend: [] }) as LibraryExercise;

const library = [lib('Присед', 'weight'), lib('Жим лёжа', 'weight'), lib('Планка', 'time'), lib('Отжимания', 'reps'), lib('Вращения плечами', 'time'), lib('Выпад', 'time')];
const TODAY = '2026-11-09';

const blocks: Block[] = [
  {
    id: 'b0',
    mode: 'timed',
    title: 'Разминка',
    exercises: [
      { id: 'b0-e0', name: 'Вращения плечами', kind: 'time', pose: 'stand', target: { min: 30, max: 30 } },
      { id: 'b0-e1', name: 'Выпад', kind: 'time', pose: 'stand', target: { min: 45, max: 45 }, sides: ['вправо', 'влево'] },
    ],
  },
  {
    id: 'b1',
    mode: 'sets',
    title: 'Подходами',
    restSec: 90,
    videoRounds: [3],
    exercises: [
      { id: 'b1-e0', name: 'Присед', kind: 'weight', target: { min: 8, max: 12 }, weight: 75, sets: 4 },
      { id: 'b1-e1', name: 'Планка', kind: 'time', target: { min: 30, max: 45 }, sets: 3 },
    ],
  },
  {
    id: 'b2',
    mode: 'circuit',
    title: 'Финишер',
    restSec: 60,
    rounds: 3,
    videoRounds: [2],
    exercises: [{ id: 'b2-e0', name: 'Отжимания', kind: 'reps', target: { min: 0, max: 0 } }],
  },
  { id: 'b3', mode: 'timed', title: 'Заминка', exercises: [{ id: 'b3-e0', name: 'Заминка', kind: 'time', pose: 'stretch', target: { min: 300, max: 300 } }] },
];

describe('workoutToYaml', () => {
  it('пишет формат импорта: упражнения разминки прямо в блоке', () => {
    const text = workoutToYaml('Ноги', blocks);
    expect(text).toContain('version: 1');
    expect(text).not.toContain('routine');
    expect(text).toMatch(/type: warmup[\s\S]*exercises:\n\s+- name: Вращения плечами/);
    expect(text).toContain('type: cooldown');
    expect(text).toContain('time: 300');
    expect(text).toMatch(/video_rounds:\n\s+- 3/);
  });
});

describe('круг блоки → YAML → блоки', () => {
  it('ничего не теряет', () => {
    const back = workoutFromYaml(workoutToYaml('Ноги', blocks), library, blocks, TODAY);
    expect(back).toEqual({ ok: true, title: 'Ноги', blocks });
  });
  it('разминка и заминка из упражнений, дописанные текстом, читаются', () => {
    const text = `version: 1
workouts:
  - title: Ноги
    blocks:
      - type: warmup
        exercises:
          - name: Планка
            time: 30s
      - type: cooldown
        exercises:
          - name: Выпад
            time: 1m
            per_side: true
`;
    const r = workoutFromYaml(text, library, [], TODAY);
    expect(r.ok && r.blocks.map((b) => [b.mode, b.exercises.length])).toEqual([['timed', 1], ['timed', 1]]);
  });
});

describe('правки', () => {
  const base = workoutToYaml('Ноги', blocks);
  it('название блока и число подходов меняются', () => {
    const text = base.replace('title: Финишер', 'title: Конец').replace('sets: 4', 'sets: 5');
    const r = workoutFromYaml(text, library, blocks, TODAY);
    expect(r.ok && r.blocks[2]!.title).toBe('Конец');
    expect(r.ok && (r.blocks[1]!.exercises[0] as { sets: number }).sets).toBe(5);
  });
  it('прежние id остаются на своих местах, новые не совпадают с ними', () => {
    const previous: Block[] = [{ ...blocks[0]!, id: 'b3', exercises: blocks[0]!.exercises.map((e, j) => ({ ...e, id: `b3-e${j}` })) } as Block];
    const r = workoutFromYaml(workoutToYaml('Ноги', blocks), library, previous, TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.blocks.flatMap((b) => [b.id, ...b.exercises.map((e) => e.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.blocks[0]!.id).toBe('b3');
  });
});

describe('ошибки', () => {
  const base = workoutToYaml('Ноги', blocks);
  it('упражнения нет в библиотеке', () => {
    const r = workoutFromYaml(base.replace('name: Присед', 'name: Тяга'), library, blocks, TODAY);
    expect(r).toMatchObject({ ok: false, issues: [{ message: 'Упражнения «Тяга» нет в библиотеке' }] });
  });
  it('две тренировки', () => {
    const r = workoutFromYaml(`${base}  - title: Ещё\n    blocks:\n      - type: warmup\n`, library, blocks, TODAY);
    expect(r.ok).toBe(false);
  });
  it('сломанный YAML даёт строку', () => {
    const r = workoutFromYaml('version: 1\nworkouts:\n\t- title: x', library, blocks, TODAY);
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.issues[0]!.line).toBeGreaterThan(0);
  });
  it('неверные video_rounds', () => {
    const r = workoutFromYaml(base.replace(/video_rounds:\n\s+- 3/, 'video_rounds: [9]'), library, blocks, TODAY);
    expect(r.ok).toBe(false);
  });
});
