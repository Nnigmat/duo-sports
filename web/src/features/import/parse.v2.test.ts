import { describe, expect, it } from 'vitest';
import type { CircuitBlock, LibraryEntry, NoteBlock, SetsBlock, TimedBlock } from '../../../../shared/types';
import { buildCommit } from './commit';
import { DEFAULT_OPTIONS } from './importPlan';
import { parseImport, type ParseContext, type ParseIssue, type ParseResult } from './parse';
import { EMPTY_CHOICES } from './preview';
import { V1_FIELD_HINTS } from './v2';

const entry = (id: string, name: string, kind: LibraryEntry['kind']): LibraryEntry => ({ id, name, aliases: [], kind, group: 'back', muscles: [], equipment: [] });
const library: LibraryEntry[] = [
  entry('pullup', 'Подтягивания', 'reps'),
  entry('pushup-handles', 'Отжимания на упорах', 'reps'),
  entry('dead-hang', 'Вис', 'time'),
  entry('db-curl-seated', 'Сгибание руки с гантелью сидя', 'weight'),
  entry('db-deadlift', 'Мёртвая тяга с гантелями', 'weight'),
  entry('ytw', 'Y-T-W лёжа', 'reps'),
  entry('wrist-mobilization', 'Мобилизация запястья', 'reps'),
  entry('lunge', 'Выпады', 'reps'),
];
const ctx: ParseContext = { library, routines: [{ id: 'warmup-common', kind: 'warmup', title: 'Общая разминка' }], today: '2026-11-02', mine: {} };

const ok = (r: ParseResult) => {
  if (!r.ok) throw new Error(`ожидали успех: ${r.errors.map((e) => `${e.message} (${e.hint ?? ''})`).join('; ')}`);
  return r;
};
const fails = (text: string): ParseIssue[] => {
  const r = parseImport(text, ctx);
  if (r.ok) throw new Error('ожидали ошибку');
  return r.errors;
};
/** Файл v2 с одной тренировкой; blocks — строки с отступом шесть пробелов */
const v2 = (blocks: string, head = '', workout = '') => `version: 2\n${head}workouts:\n  - title: Т\n    date: 2026-11-03\n${workout}    blocks:\n${blocks}`;
const sets = (line: string) => v2(`      - type: sets\n        exercises:\n          - { ${line} }\n`);
const circuit = (line: string, block = '') => v2(`      - type: circuit\n${block}        exercises:\n          - { ${line} }\n`);
const first = (text: string) => ok(parseImport(text, ctx)).workouts[0]!.structure[0]!;
const setsEx = (text: string) => (first(text) as SetsBlock).exercises[0]!;
const circuitEx = (text: string) => (first(text) as CircuitBlock).exercises[0]!;
const EX = ['workouts', 0, 'blocks', 0, 'exercises', 0];

describe('формат version: 2', () => {
  it('rest_sec 180 in sets exercise', () => {
    expect(setsEx(sets('exercise_id: pullup, sets: 1, reps: max, rest_sec: 180'))).toMatchObject({ restSec: 180 });
  });

  it('rest_sec by default is 90 in sets exercise', () => {
    expect(setsEx(sets('exercise_id: pullup, reps: 5'))).toMatchObject({ sets: 1, restSec: 90 });
  });

  it.each(['3 мин', '2-3 мин', '2–3 мин'])('rest_sec %s is an error with hint', (rest) => {
    const e = fails(sets(`exercise_id: pullup, reps: 5, rest_sec: "${rest}"`)).find((x) => x.path?.at(-1) === 'rest_sec');
    expect(e).toMatchObject({ hint: 'rest_sec — целое число секунд, например 180', path: [...EX, 'rest_sec'] });
    expect(e!.line).toBe(8);
  });

  it('time_sec max', () => {
    expect(setsEx(sets('exercise_id: dead-hang, sets: 1, time_sec: max, rest_sec: 180'))).toMatchObject({ kind: 'time', target: { min: 0, max: 0 }, restSec: 180 });
  });

  it('reps max', () => {
    expect(setsEx(sets('exercise_id: pushup-handles, sets: 1, reps: max'))).toMatchObject({ kind: 'reps', target: { min: 0, max: 0 }, sets: 1 });
  });

  it('reps "12-14" in circuit without sets', () => {
    expect(circuitEx(circuit('exercise_id: lunge, reps: "12-14"'))).toMatchObject({ kind: 'reps', target: { min: 12, max: 14 } });
  });

  it('reps "10-12" with weight_kg 8', () => {
    expect(circuitEx(circuit('exercise_id: db-curl-seated, reps: "10-12", weight_kg: 8'))).toMatchObject({ kind: 'weight', weight: 8, target: { min: 10, max: 12 } });
  });

  it('reps "12-14" with weight_kg 20', () => {
    expect(circuitEx(circuit('exercise_id: db-deadlift, reps: "12-14", weight_kg: 20'))).toMatchObject({ kind: 'weight', weight: 20 });
  });

  it('sets 1 reps 5 notes', () => {
    expect(setsEx(sets('exercise_id: ytw, sets: 1, reps: 5, notes: на каждую букву'))).toMatchObject({ sets: 1, target: { min: 5, max: 5 }, note: 'на каждую букву' });
  });

  it('sets 2 reps 2 notes', () => {
    expect(setsEx(sets('exercise_id: pullup, sets: 2, reps: 2, notes: 5 с на опускание'))).toMatchObject({ sets: 2, target: { min: 2, max: 2 }, note: '5 с на опускание' });
  });

  it('note block', () => {
    const text = v2(`      - type: note\n        title: Тест большого пальца\n        text: Есть ли резкая боль\n      - type: sets\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n`);
    const r = ok(parseImport(text, ctx));
    expect(r.workouts[0]!.structure[0]).toEqual({ id: 'b0', mode: 'note', title: 'Тест большого пальца', text: 'Есть ли резкая боль' } satisfies NoteBlock);
    expect(r.workouts[0]!.blocks[0]).toMatchObject({ heading: 'Тест большого пальца', text: 'Есть ли резкая боль', items: [] });
  });

  it('v1 field in v2 names the v2 field', () => {
    const errors = fails(sets('exercise_id: pullup, do: "3x12"'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ hint: V1_FIELD_HINTS.do, path: [...EX, 'do'] });
    expect(V1_FIELD_HINTS.do).toBe('В version: 2 — sets, reps и weight_kg');
  });

  it('routine item reps exercise time_sec 30', () => {
    const head = 'routines:\n  - id: warmup-wrists\n    title: Разминка с запястьями\n    note: Повторяйте за персонажем\n    exercises:\n      - { exercise_id: wrist-mobilization, time_sec: 30 }\n      - { exercise_id: lunge, time_sec: 15, sides: [влево, вправо] }\n';
    const r = ok(parseImport(v2('      - { type: warmup, routine: warmup-wrists }\n      - type: sets\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n', head), ctx));
    expect(r.routines).toEqual([
      {
        id: 'warmup-wrists', kind: 'warmup', title: 'Разминка с запястьями', note: 'Повторяйте за персонажем',
        items: [{ exercise: 'wrist-mobilization', sec: { min: 30, max: 30 } }, { exercise: 'lunge', sec: { min: 15, max: 15 }, sides: ['влево', 'вправо'] }],
      },
    ]);
    expect(r.workouts[0]!.warmupRoutine).toBe('warmup-wrists');
  });

  it('unknown exercise_id suggests closest ids', () => {
    const e = fails(sets('exercise_id: pull-up, reps: 5'))[0]!;
    expect(e).toMatchObject({ message: 'Неизвестный exercise_id: pull-up', path: [...EX, 'exercise_id'] });
    expect(e.hint).toContain('pullup');
  });

  it('routine id used as exercise_id', () => {
    const e = fails(sets('exercise_id: warmup-common, reps: 5'))[0]!;
    expect(e.hint).toContain('это id разминки');
    expect(e.path).toEqual([...EX, 'exercise_id']);
  });

  it('sets in circuit is an error', () => {
    expect(fails(circuit('exercise_id: lunge, sets: 2, reps: 10'))[0]).toMatchObject({ path: [...EX, 'sets'] });
  });

  it('rest_sec on circuit exercise is an error', () => {
    expect(fails(circuit('exercise_id: lunge, reps: 10, rest_sec: 30'))[0]).toMatchObject({ path: [...EX, 'rest_sec'] });
  });

  it('weight_kg without reps is an error', () => {
    expect(fails(sets('exercise_id: dead-hang, time_sec: 30, weight_kg: 10'))[0]).toMatchObject({ path: [...EX, 'weight_kg'] });
  });

  it('reps and time_sec together is an error', () => {
    expect(fails(sets('exercise_id: pullup, reps: 5, time_sec: 30'))[0]!.path).toEqual(EX);
  });

  it('sides with one label is an error', () => {
    expect(fails(circuit('exercise_id: lunge, reps: 10, sides: [левая нога]'))[0]).toMatchObject({ path: [...EX, 'sides'] });
  });

  it('sides with two labels', () => {
    expect(circuitEx(circuit('exercise_id: lunge, reps: 10, sides: [левая нога, правая нога]'))).toMatchObject({ sides: ['левая нога', 'правая нога'] });
  });

  it('time_sec max in timed block is an error', () => {
    const text = v2('      - type: timed\n        exercises:\n          - { exercise_id: dead-hang, time_sec: max }\n');
    expect(fails(text)[0]).toMatchObject({ path: [...EX, 'time_sec'] });
  });

  it('circuit rest_sec is after round', () => {
    expect(first(circuit('exercise_id: lunge, reps: 10', '        rounds: 2\n        rest_sec: 90\n'))).toMatchObject({ mode: 'circuit', rounds: 2, restAfter: 'round', restSec: 90 });
  });

  it('circuit rest_sec by default is 60 after round', () => {
    expect(first(circuit('exercise_id: lunge, reps: 10'))).toMatchObject({ rounds: 1, restAfter: 'round', restSec: 60 });
  });

  it('circuit rest_after round is rest after round', () => {
    expect(first(circuit('exercise_id: lunge, reps: 10', '        rest_after: round\n'))).toMatchObject({ restAfter: 'round' });
  });

  it('circuit rest_after exercise is rest after each exercise', () => {
    const block = first(circuit('exercise_id: lunge, reps: 10', '        rounds: 3\n        rest_sec: 45\n        rest_after: exercise\n'));
    expect(block).toMatchObject({ mode: 'circuit', rounds: 3, restSec: 45 });
    expect(block).not.toHaveProperty('restAfter');
  });

  it('circuit rest_after exercise is shown in preview heading', () => {
    const r = ok(parseImport(circuit('exercise_id: lunge, reps: 10', '        rounds: 2\n        rest_after: exercise\n'), ctx));
    expect(r.workouts[0]!.blocks[0]!.heading).toBe('Круг · 2 раунда · отдых после каждого упражнения');
  });

  it('circuit rest_after other value is an error', () => {
    expect(fails(circuit('exercise_id: lunge, reps: 10', '        rest_after: set\n'))[0]).toMatchObject({ path: ['workouts', 0, 'blocks', 0, 'rest_after'] });
  });

  it('rest_after in sets block is an error', () => {
    const text = v2('      - type: sets\n        rest_after: exercise\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n');
    expect(fails(text).find((e) => e.path?.at(-1) === 'rest_after')).toMatchObject({ message: 'Незнакомое поле: rest_after' });
  });

  it('workout notes parsed', () => {
    const r = ok(parseImport(v2('      - type: sets\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n', '', '    notes: Рабочих подходов отжиманий сегодня нет\n'), ctx));
    expect(r.workouts[0]!.notes).toBe('Рабочих подходов отжиманий сегодня нет');
  });

  it('workout notes reach the commit', () => {
    const r = ok(parseImport(v2('      - type: sets\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n', '', '    notes: Рабочих подходов отжиманий сегодня нет\n'), ctx));
    expect(buildCommit(r, EMPTY_CHOICES, DEFAULT_OPTIONS).workouts[0]!.notes).toBe('Рабочих подходов отжиманий сегодня нет');
  });

  it('warmup with inline exercises is an error in v2', () => {
    const text = v2('      - type: warmup\n        exercises:\n          - { exercise_id: dead-hang, time_sec: 30 }\n      - type: sets\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n');
    const errors = fails(text);
    expect(errors.some((e) => e.path?.join('.') === 'workouts.0.blocks.0.exercises')).toBe(true);
  });

  it('timed block with title and text', () => {
    const text = v2('      - type: timed\n        title: Планка\n        text: Спина прямая\n        exercises:\n          - { exercise_id: dead-hang, time_sec: 30, sides: [вправо, влево] }\n');
    expect(first(text) as TimedBlock).toMatchObject({ mode: 'timed', title: 'Планка', note: 'Спина прямая', exercises: [{ kind: 'time', target: { min: 30, max: 30 }, sides: ['вправо', 'влево'] }] });
  });

  it('every v2 error carries a path', () => {
    const text = 'version: 2\nunits: kg\nworkouts:\n  - title: Т\n    rest: 60\n    blocks:\n      - { type: superset, exercises: [] }\n';
    const errors = fails(text);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => Array.isArray(e.path) && e.line !== undefined)).toBe(true);
  });

  it('version other than 1 or 2 is an error', () => {
    expect(fails('version: 3\nworkouts: []\n')[0]!.message).toBe('Нужно version: 1 или 2');
  });
});

describe('id набора вместо упражнения внутри набора', () => {
  it('подсказка, без падения', () => {
    const head = 'routines:\n  - id: warmup-a\n    exercises:\n      - { exercise_id: wrist-mobilization, time_sec: 30 }\n  - id: warmup-b\n    exercises:\n      - { exercise_id: warmup-a, time_sec: 30 }\n';
    const errors = fails(v2('      - { type: warmup, routine: warmup-b }\n      - type: sets\n        exercises:\n          - { exercise_id: pullup, reps: 5 }\n', head));
    expect(errors[0]).toMatchObject({ path: ['routines', 1, 'exercises', 0, 'exercise_id'] });
    expect(errors[0]!.hint).toContain('это id разминки');
  });
});

describe('проверки v2 сверх v1', () => {
  it('reps "0" is an error in v2', () => {
    expect(fails(sets('exercise_id: pullup, reps: "0"'))[0]).toMatchObject({ path: [...EX, 'reps'], message: 'Не понимаю reps: 0' });
    expect(fails(sets('exercise_id: pullup, reps: 0'))[0]).toMatchObject({ path: [...EX, 'reps'] });
    expect(fails(sets('exercise_id: pullup, reps: "0-0"'))[0]).toMatchObject({ path: [...EX, 'reps'] });
  });

  it('reps "0-5" is still a range', () => {
    expect(setsEx(sets('exercise_id: pullup, reps: "0-5"'))).toMatchObject({ target: { min: 0, max: 5 } });
  });

  it('main part of only note blocks is an error', () => {
    const errors = fails(v2('      - { type: warmup, routine: warmup-common }\n      - type: note\n        title: Тест\n        text: Есть ли боль\n'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ path: ['workouts', 0, 'blocks'], message: 'В «Т» нет основной части' });
  });
});
