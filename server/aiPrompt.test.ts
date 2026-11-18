import { beforeEach, describe, expect, it } from 'vitest';
import type { DraftRequest } from '../shared/aiDraft';
import { AGENT_FORMAT, AGENT_INSTRUCTIONS } from './aiInstructions';
import { buildPrompt, promptLibrary, promptRoutines, type PromptExercise, type PromptRoutine } from './aiPrompt';
import { openDb, type Db } from './db';
import { createExercise } from './exercises';
import { createRoutine } from './routines';

const library: PromptExercise[] = [
  { id: 'bench-press', name: 'Жим лёжа', aliases: ['жим'], kind: 'weight', muscles: ['грудь'], equipment: ['Штанга'] },
  { id: 'arm-circles', name: 'Вращение руками', aliases: [], kind: 'time', muscles: ['плечи'], equipment: [] },
];
const routines: PromptRoutine[] = [
  { id: 'neck', kind: 'warmup', title: 'Шея и плечи', items: [{ exercise: 'arm-circles', sec: 30, sides: ['вперёд', 'назад'] }] },
];
const request: DraftRequest = {
  athleteId: 7,
  date: '2026-11-18',
  title: '',
  warmup: { routine: 'neck' },
  main: { text: 'жим лёжа 4×8 60 кг, потом суперсет бицепс-трицепс', exercises: ['bench-press'] },
  cooldown: { text: 'растяжка спины 5 минут' },
  errors: ['Неизвестный exercise_id: biceps-curlz'],
};
const build = (over: Partial<Parameters<typeof buildPrompt>[0]> = {}) =>
  buildPrompt({ rules: 'Отдых 90 с', routines, library, request, today: '2026-11-17', ...over });

describe('buildPrompt', () => {
  it('orders parts from stable to volatile', () => {
    const p = build();
    expect(p.system).toHaveLength(5);
    expect(p.system[0]!.text).toBe(AGENT_INSTRUCTIONS);
    expect(p.system[1]!.text).toBe(AGENT_FORMAT);
    expect(p.system[2]!.text).toContain('Отдых 90 с');
    expect(p.system[3]!.text).toContain('Шея и плечи');
    expect(p.system[4]!.text).toContain('Жим лёжа');
  });

  it('labels exercise and routine ids', () => {
    const p = build();
    expect(p.system[3]!.text.startsWith('Разминки и заминки — id наборов (JSON)')).toBe(true);
    expect(p.system[4]!.text.startsWith('Библиотека упражнений — id упражнений (JSON)')).toBe(true);
  });

  it('puts cache breakpoints after rules and library only', () => {
    const p = build();
    expect(p.system.map((b) => b.cache_control ?? null)).toEqual([null, null, { type: 'ephemeral' }, null, { type: 'ephemeral' }]);
  });

  it('serializes library deterministically', () => {
    const a = build();
    const b = build({ library: [...library].reverse(), routines: [...routines] });
    expect(b.system[4]!.text).toBe(a.system[4]!.text);
    expect(a.system[4]!.text).not.toContain('demo');
    // Сортировка по id: arm-circles раньше bench-press
    expect(a.system[4]!.text.indexOf('arm-circles')).toBeLessThan(a.system[4]!.text.indexOf('bench-press'));
  });

  it('request goes only to user message', () => {
    const p = build();
    const system = p.system.map((b) => b.text).join('\n');
    for (const part of ['суперсет бицепс-трицепс', 'растяжка спины 5 минут', 'biceps-curlz', '2026-11-18']) {
      expect(p.user).toContain(part);
      expect(system).not.toContain(part);
    }
    expect(p.user).toContain('bench-press');
  });

  it('system does not depend on request or today', () => {
    const a = build();
    const b = build({ request: { ...request, main: { text: 'другое', exercises: [] }, errors: undefined }, today: '2026-12-01' });
    expect(b.system).toEqual(a.system);
  });
});

describe('данные для запроса из базы', () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(':memory:');
  });
  const ex = (name: string, kind: 'time' | 'reps' = 'time') => {
    const r = createExercise(db, { name, group: 'core', kind, muscles: ['кор'], aliases: [] });
    if (!r.ok) throw new Error('exercise');
    return r.entry.id;
  };

  it('promptLibrary drops demo and sorts by id', () => {
    const plank = ex('Планка');
    const bridge = ex('Ягодичный мост', 'reps');
    db.prepare("UPDATE exercises SET demo_female = 'x.mp4', notes = 'Спина прямая' WHERE slug = ?").run(plank);
    const lib = promptLibrary(db);
    expect(lib.map((e) => e.id)).toEqual([plank, bridge].sort());
    for (const e of lib) expect(Object.keys(e).sort()).toEqual(['aliases', 'equipment', 'id', 'kind', 'muscles', 'name']);
  });

  it('promptRoutines returns items in position order', () => {
    const a = ex('Вращение головой');
    const b = ex('Вращение плечами');
    const r = createRoutine(db, { kind: 'warmup', title: 'Шея', items: [{ exercise: b, sec: { min: 20, max: 20 }, sides: ['вперёд', 'назад'] }, { exercise: a, sec: { min: 30, max: 30 } }] });
    if (!r.ok) throw new Error('routine');
    expect(promptRoutines(db)).toEqual([
      { id: r.routine.id, kind: 'warmup', title: 'Шея', items: [{ exercise: b, sec: 20, sides: ['вперёд', 'назад'] }, { exercise: a, sec: 30, sides: null }] },
    ]);
  });
});
