import { describe, expect, it } from 'vitest';
import type { AgentWorkout } from '../../../../shared/aiDraft';
import { parseImport, type ParseIssue } from '../import/parse';
import { draftFromParsed } from './fromParsed';
import { repairAgentWorkout, repairAndParse, toAgentPath } from './repair';
import { agent, ctx, library } from './testkit';
import { agentToImportYaml } from './toImportDoc';

const DATE = '2026-11-18';
const issuesOf = (w: AgentWorkout): ParseIssue[] => {
  const r = parseImport(agentToImportYaml(w, DATE), ctx);
  return r.ok ? [] : r.errors;
};
const repair = (w: AgentWorkout) => repairAgentWorkout(w, issuesOf(w), library);
/** Ремонт по кругу, как в buildWorkout; не сошлось — тест падает */
const repaired = (w: AgentWorkout) => {
  const r = repairAndParse(w, issuesOf(w), ctx, DATE);
  if (!r.ok) throw new Error('ремонт не сошёлся');
  return r;
};
const ownRoutine = (id: string, exercise_id = 'arm-circles') => ({ new_routine: { id, title: 'Своя', exercises: [{ exercise_id, time_sec: 30 }] } });
const dips = { exercise_id: 'dips', sets: 3, reps: '10' };

describe('toAgentPath', () => {
  const two = agent({ blocks: [{ type: 'sets', exercises: [dips] }, { type: 'circuit', rounds: 3, exercises: [dips, dips] }] });

  it('maps blocks with library warmup and no cooldown', () => {
    expect(toAgentPath(['workouts', 0, 'blocks', 0, 'routine'], two)).toEqual({ at: 'routine', which: 'warmup' });
    expect(toAgentPath(['workouts', 0, 'blocks', 2, 'exercises', 1, 'reps'], two)).toEqual({ at: 'exercise', block: 1, exercise: 1, field: 'reps' });
    expect(toAgentPath(['workouts', 0, 'blocks', 1, 'exercises', 0], two)).toEqual({ at: 'exercise', block: 0, exercise: 0 });
    expect(toAgentPath(['workouts', 0, 'blocks', 2, 'rounds'], two)).toEqual({ at: 'block', block: 1, field: 'rounds' });
    expect(toAgentPath(['workouts', 0, 'blocks', 2, 'exercises'], two)).toEqual({ at: 'block', block: 1, field: 'exercises' });
    expect(toAgentPath(['workouts', 0, 'blocks', 2], two)).toEqual({ at: 'block', block: 1 });
  });

  it('maps blocks without warmup and with cooldown', () => {
    const w = { ...two, warmup: null, cooldown: { routine: 'back-stretch' } };
    expect(toAgentPath(['workouts', 0, 'blocks', 0, 'exercises', 0, 'sets'], w)).toEqual({ at: 'exercise', block: 0, exercise: 0, field: 'sets' });
    expect(toAgentPath(['workouts', 0, 'blocks', 2, 'routine'], w)).toEqual({ at: 'routine', which: 'cooldown' });
  });

  it('maps routines: own warmup first, own cooldown alone is routines[0]', () => {
    expect(toAgentPath(['routines', 1, 'exercises', 0, 'time_sec'], { ...two, warmup: ownRoutine('w'), cooldown: ownRoutine('c') })).toEqual({ at: 'routine', which: 'cooldown' });
    expect(toAgentPath(['routines', 0, 'id'], { ...two, warmup: ownRoutine('w'), cooldown: ownRoutine('c') })).toEqual({ at: 'routine', which: 'warmup' });
    expect(toAgentPath(['routines', 0], { ...two, cooldown: ownRoutine('c') })).toEqual({ at: 'routine', which: 'cooldown' });
  });

  it('maps new exercises and gives up on workout-level paths', () => {
    expect(toAgentPath(['exercises', 2, 'measure'], two)).toEqual({ at: 'newExercise', index: 2 });
    expect(toAgentPath(['workouts', 0, 'blocks'], two)).toBeNull();
    expect(toAgentPath(['workouts', 0], two)).toBeNull();
    expect(toAgentPath(['version'], two)).toBeNull();
  });
});

describe('repairAgentWorkout', () => {
  it('repair maps yaml path with warmup present', () => {
    const w = agent({ warmup: ownRoutine('my-warm'), blocks: [{ type: 'sets', exercises: [dips] }, { type: 'sets', exercises: [{ ...dips, reps: 'много' }] }] });
    const r = repair(w);
    expect(r.marks).toEqual([{ blockIndex: 1, exerciseIndex: 0, field: 'reps', wrote: 'много', message: 'Не понимаю reps: много' }]);
    expect(r.workout.blocks[0]!.exercises[0]).toEqual(dips);
    expect(r.workout.blocks[1]!.exercises[0]!.reps).toBe('10');
  });

  it('error in own warmup routine makes it none', () => {
    const w = agent({ warmup: { new_routine: { id: 'my-warm', title: 'Своя', exercises: [{ exercise_id: 'arm-circles', time_sec: -5 }] } } });
    const r = repair(w);
    expect(r.workout.warmup).toBeNull();
    expect(r.workout.blocks).toEqual(w.blocks);
    expect(r.marks).toEqual([]);
    expect(r.unparsed).toEqual([{ what: 'Своя', message: 'Не понимаю time_sec: -5' }]);
  });

  const cases: Array<{ name: string; w: AgentWorkout; field: string; wrote: string; check: (w: AgentWorkout) => void }> = [
    {
      name: 'sets in circuit',
      w: agent({ blocks: [{ type: 'circuit', rounds: 3, exercises: [dips] }] }),
      field: 'sets',
      wrote: '3',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'dips', reps: '10' }),
    },
    {
      name: 'rest_sec on circuit exercise',
      w: agent({ blocks: [{ type: 'circuit', rounds: 3, exercises: [{ exercise_id: 'dips', reps: '12', rest_sec: 30 }] }] }),
      field: 'rest_sec',
      wrote: '30',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'dips', reps: '12' }),
    },
    {
      name: 'weight_kg without reps',
      w: agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', sets: 3, time_sec: 40, weight_kg: 60 }] }] }),
      field: 'weight_kg',
      wrote: '60',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'bench-press', sets: 3, time_sec: 40 }),
    },
    {
      name: 'reps and time_sec together',
      w: agent({ blocks: [{ type: 'circuit', rounds: 2, exercises: [{ exercise_id: 'arm-circles', reps: '10', time_sec: 45 }] }] }),
      field: 'load',
      wrote: 'reps: 10, time_sec: 45',
      // Остаётся нагрузка по типу упражнения: вращение руками — на время
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'arm-circles', time_sec: 45 }),
    },
    {
      name: 'sides with one label',
      w: agent({ blocks: [{ type: 'sets', exercises: [{ ...dips, sides: ['влево'] }] }] }),
      field: 'sides',
      wrote: 'влево',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual(dips),
    },
    {
      name: 'time_sec max in timed block',
      w: agent({ blocks: [{ type: 'timed', exercises: [{ exercise_id: 'arm-circles', time_sec: 'max' }] }] }),
      field: 'time_sec',
      wrote: 'max',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'arm-circles', time_sec: 30 }),
    },
    {
      name: 'bad reps',
      w: agent({ blocks: [{ type: 'sets', exercises: [{ ...dips, reps: '10 на каждую' }] }] }),
      field: 'reps',
      wrote: '10 на каждую',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual(dips),
    },
    {
      name: 'bad time_sec',
      w: agent({ blocks: [{ type: 'circuit', rounds: 2, exercises: [{ exercise_id: 'arm-circles', time_sec: 12.5 }] }] }),
      field: 'time_sec',
      wrote: '12.5',
      check: (w) => expect(w.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'arm-circles', time_sec: 30 }),
    },
  ];
  for (const c of cases) {
    it(`repairs ${c.name}`, () => {
      const r = repair(c.w);
      c.check(r.workout);
      expect(r.marks).toHaveLength(1);
      expect(r.marks[0]).toMatchObject({ blockIndex: 0, exerciseIndex: 0, field: c.field, wrote: c.wrote });
      expect(issuesOf(r.workout)).toEqual([]);
    });
  }

  it('reps and time_sec together keeps reps for a reps exercise', () => {
    const r = repair(agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', sets: 3, reps: '8', time_sec: 40, weight_kg: 60 }] }] }));
    expect(r.workout.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'bench-press', sets: 3, reps: '8', weight_kg: 60 });
  });

  it('repairs bad load into mark', () => {
    const w = agent({ blocks: [{ type: 'circuit', rounds: 2, exercises: [{ exercise_id: 'arm-circles', time_sec: 'до отказа' as unknown as number }] }] });
    const r = repair(w);
    expect(r.workout.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'arm-circles', time_sec: 30 });
    expect(r.marks).toEqual([{ blockIndex: 0, exerciseIndex: 0, field: 'time_sec', wrote: 'до отказа', message: 'Не понимаю time_sec: до отказа' }]);
    expect(issuesOf(r.workout)).toEqual([]);
  });

  it('extra fields in timed block are removed over rounds and get a default', () => {
    const r = repaired(agent({ blocks: [{ type: 'timed', exercises: [{ exercise_id: 'arm-circles', reps: '20', notes: 'Медленно' }] }] }));
    expect(r.workout.blocks[0]!.exercises[0]).toEqual({ exercise_id: 'arm-circles', time_sec: 30 });
    expect(r.marks).toHaveLength(1);
  });

  it('unknown exercise goes to unparsed', () => {
    const r = repair(agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-pres', sets: 4, reps: '8' }, dips] }] }));
    expect(r.workout.blocks).toEqual([{ type: 'sets', exercises: [dips] }]);
    expect(r.unparsed).toEqual([{ what: 'bench-pres', message: 'Неизвестный exercise_id: bench-pres' }]);
    expect(r.marks).toEqual([]);
  });

  it('block without exercises is removed', () => {
    const r = repair(agent({ blocks: [{ type: 'circuit', rounds: 3, exercises: [] }, { type: 'sets', exercises: [dips] }] }));
    expect(r.workout.blocks).toEqual([{ type: 'sets', exercises: [dips] }]);
    expect(r.unparsed).toHaveLength(1);
    expect(issuesOf(r.workout)).toEqual([]);
  });

  it('misplaced block field is removed and named in unparsed', () => {
    const r = repair(agent({ blocks: [{ type: 'sets', rounds: 3, exercises: [dips] }] }));
    expect(r.workout.blocks).toEqual([{ type: 'sets', exercises: [dips] }]);
    expect(r.unparsed).toEqual([{ what: 'rounds: 3', message: 'Незнакомое поле: rounds' }]);
  });

  it('broken own routine becomes none', () => {
    const w = agent({ warmup: null, cooldown: ownRoutine('my-cool', 'neck-rol') });
    const r = repair(w);
    expect(r.workout.cooldown).toBeNull();
    expect(r.unparsed).toEqual([{ what: 'Своя', message: 'Неизвестный exercise_id: neck-rol' }]);
    expect(issuesOf(r.workout)).toEqual([]);
  });

  it('broken new exercise removed with its uses', () => {
    const broken = { id: 'neck-roll', name: 'Наклоны головы', muscles: [], measure: 'yoga' as never, equipment: [], aliases: [] };
    const w = agent({
      new_exercises: [broken],
      warmup: { new_routine: { id: 'my-warm', title: 'Шея', exercises: [{ exercise_id: 'neck-roll', time_sec: 30 }, { exercise_id: 'arm-circles', time_sec: 30 }] } },
      blocks: [{ type: 'circuit', rounds: 2, exercises: [{ exercise_id: 'neck-roll', time_sec: 30 }] }, { type: 'sets', exercises: [{ exercise_id: 'neck-roll', reps: '5' }, dips] }],
    });
    const r = repair(w);
    expect(r.workout.new_exercises).toEqual([]);
    expect(r.workout.blocks).toEqual([{ type: 'sets', exercises: [dips] }]);
    expect(r.workout.warmup).toEqual({ new_routine: { id: 'my-warm', title: 'Шея', exercises: [{ exercise_id: 'arm-circles', time_sec: 30 }] } });
    expect(r.unparsed).toEqual([{ what: 'Наклоны головы', message: 'Неизвестный measure: yoga' }]);
    expect(issuesOf(r.workout)).toEqual([]);
  });

  it('mark keys computed after removals', () => {
    const w = agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-pres', sets: 4, reps: '8' }, dips, { ...dips, reps: 'много' }] }] });
    const r = repaired(w);
    expect(r.marks).toEqual([{ blockIndex: 0, exerciseIndex: 1, field: 'reps', wrote: 'много', message: 'Не понимаю reps: много' }]);
    const d = draftFromParsed(r.parsed, r.workout, ctx, DATE, [], r);
    expect(Object.keys(d.marks)).toEqual(['b0-e1']);
    expect(d.unparsed).toEqual([{ what: 'bench-pres', message: 'Неизвестный exercise_id: bench-pres' }]);
  });

  it('marks follow their exercise when a later round removes an earlier block', () => {
    // Незнакомое поле блока прячет ошибки его упражнений до следующего разбора
    const w = agent({ blocks: [{ type: 'sets', rounds: 3, exercises: [{ exercise_id: 'bench-pres', sets: 4, reps: '8' }] }, { type: 'sets', exercises: [dips, { ...dips, reps: 'много' }] }] });
    const r = repaired(w);
    expect(r.workout.blocks).toEqual([{ type: 'sets', exercises: [dips, dips] }]);
    expect(r.marks).toEqual([{ blockIndex: 0, exerciseIndex: 1, field: 'reps', wrote: 'много', message: 'Не понимаю reps: много' }]);
    expect(r.unparsed.map((u) => u.what)).toEqual(['rounds: 3', 'bench-pres']);
    const d = draftFromParsed(r.parsed, r.workout, ctx, DATE, [], r);
    expect(Object.keys(d.marks)).toEqual(['b0-e1']);
  });

  it('gives up when nothing of the main part is left', () => {
    const w = agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-pres', sets: 4, reps: '8' }] }] });
    expect(repairAndParse(w, issuesOf(w), ctx, DATE)).toEqual({ ok: false });
  });
});
