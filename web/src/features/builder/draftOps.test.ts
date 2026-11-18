import { describe, expect, it } from 'vitest';
import type { SetsExercise } from '../../../../shared/types';
import { toLibraryExercise } from '../exercises/api';
import {
  applyAdvice, createExercise, dismissAdvice, removeNew, moveRoutineItem, patchNewExercise, patchRoutineItem, pruneNew, removeRoutineItem, renameRoutine, replaceExercise, setRoutine, usedNames,
} from './draftOps';
import { library as entries } from './testkit';
import type { BuilderDraft, NewExerciseDraft } from './types';
import { exercisesOf } from '../../../../shared/blocks';

const library = entries.map(toLibraryExercise);
const dips = library.find((l) => l.id === 'dips')!;
const clap: NewExerciseDraft = { name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['грудь'], kind: 'reps', equipment: [], notes: '', aliases: [], similar: 'Отжимания на брусьях' };
const bend: NewExerciseDraft = { name: 'Наклон к ногам', slug: 'bend', muscles: ['спина'], kind: 'time', equipment: [], notes: '', aliases: [] };

const base = (): BuilderDraft => ({
  date: '2026-11-18',
  title: 'Верх',
  blocks: [
    { id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'x1', name: 'Отжимания с хлопком', kind: 'reps', target: { min: 10, max: 10 }, sets: 3 }] },
    { id: 'b2', mode: 'circuit', title: 'Круг', rounds: 3, restSec: 60, videoRounds: [], exercises: [{ id: 'x2', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60 }] },
  ],
  newExercises: [clap, bend],
  warmup: { kind: 'library', slug: 'neck-shoulders' },
  cooldown: { kind: 'new', title: 'Растяжка', items: [{ name: 'Наклон к ногам', sec: 45 }, { name: 'Вращение руками', sec: 30, sides: ['вправо', 'влево'] }] },
  advice: [
    { id: 'a0', text: 'В библиотеке есть похожее — Отжимания на брусьях', exercise: 'Отжимания с хлопком', suggest: 'Отжимания на брусьях' },
    { id: 'a1', text: 'Отдых добавлен по правилам' },
  ],
  marks: {},
  unparsed: [],
});
const names = (d: BuilderDraft, block: number) => exercisesOf(d.blocks[block]!).map((e) => e.name);

describe('правка черновика', () => {
  it('createExercise adds row and new entry', () => {
    const d = createExercise(base(), 'b2', 'Тяга резинки');
    expect(names(d, 1)).toEqual(['Жим лёжа', 'Тяга резинки']);
    expect(d.newExercises.at(-1)).toMatchObject({ name: 'Тяга резинки', kind: 'reps', muscles: [], slug: expect.stringMatching(/^my-/) });
    // Повторное создание того же имени не плодит запись
    expect(createExercise(d, 'b1', 'Тяга резинки').newExercises.filter((e) => e.name === 'Тяга резинки')).toHaveLength(1);
  });

  it('renaming new exercise renames rows and routine items', () => {
    let d = createExercise(base(), 'b1', 'Наклон к ногам');
    d = patchNewExercise(d, 'Наклон к ногам', { name: 'Наклон вперёд' });
    expect(names(d, 0)).toContain('Наклон вперёд');
    expect(d.cooldown).toMatchObject({ items: [{ name: 'Наклон вперёд' }, { name: 'Вращение руками' }] });
    expect(d.newExercises.map((e) => e.name)).toContain('Наклон вперёд');
  });

  it('changing kind of new exercise updates its rows', () => {
    const d = patchNewExercise(base(), 'Отжимания с хлопком', { kind: 'weight' });
    expect(exercisesOf(d.blocks[0]!)[0]).toMatchObject({ kind: 'weight', weight: expect.any(Number) });
  });

  it('replaceExercise swaps name and kind and drops unused new', () => {
    const d = replaceExercise(base(), 'Отжимания с хлопком', dips);
    expect(exercisesOf(d.blocks[0]!)[0]).toMatchObject({ id: 'x1', name: 'Отжимания на брусьях', kind: 'reps', sets: 3 });
    expect(d.newExercises.map((e) => e.name)).toEqual(['Наклон к ногам']);
    expect(d.advice.map((a) => a.id)).toEqual(['a1']);
  });

  it('replaceExercise renames the routine item to any library exercise and drops the unused new one', () => {
    // Наклон стоит и в блоке, и в заминке; заминка принимает любое упражнение, так что имя меняется и там
    const d = createExercise(base(), 'b2', 'Наклон к ногам');
    const r = replaceExercise(d, 'Наклон к ногам', dips);
    expect(names(r, 1)).toEqual(['Жим лёжа', 'Отжимания на брусьях']);
    expect(r.cooldown).toMatchObject({ items: [{ name: 'Отжимания на брусьях' }, { name: 'Вращение руками' }] });
    expect(r.newExercises.map((e) => e.name)).not.toContain('Наклон к ногам');
  });

  it('replaceExercise with time exercise reaches new routine too', () => {
    const arm = library.find((l) => l.id === 'arm-circles')!;
    const r = replaceExercise(base(), 'Наклон к ногам', arm);
    expect(r.cooldown).toMatchObject({ items: [{ name: 'Вращение руками', sec: 45 }, { name: 'Вращение руками' }] });
    expect(r.newExercises.map((e) => e.name)).toEqual(['Отжимания с хлопком']);
  });

  it('replaceExercise to time kind resets target to seconds', () => {
    const arm = library.find((l) => l.id === 'arm-circles')!;
    const d = replaceExercise(base(), 'Жим лёжа', arm);
    const e = exercisesOf(d.blocks[1]!)[0]!;
    expect(e).toMatchObject({ name: 'Вращение руками', kind: 'time', target: { min: 30, max: 30 } });
    expect(e).not.toHaveProperty('weight');
  });

  it('applyAdvice uses suggest and removes advice', () => {
    const d = applyAdvice(base(), 'a0', library);
    expect(names(d, 0)).toEqual(['Отжимания на брусьях']);
    expect(d.advice.map((a) => a.id)).toEqual(['a1']);
    expect(d.newExercises.find((e) => e.name === 'Отжимания с хлопком')).toBeUndefined();
  });

  it('applyAdvice replaces renamed new exercise', () => {
    const d = patchNewExercise(base(), 'Отжимания с хлопком', { name: 'Хлопки' });
    expect(d.advice[0]).toMatchObject({ exercise: 'Хлопки' });
    const r = applyAdvice(d, 'a0', library);
    expect(names(r, 0)).toEqual(['Отжимания на брусьях']);
    expect(r.newExercises.map((e) => e.name)).toEqual(['Наклон к ногам']);
  });

  it('applyAdvice matches exercise name ignoring case and ё', () => {
    const d = { ...base(), advice: [{ id: 'a0', text: 'Похожее', exercise: 'отжимания С ХЛОПКОМ ', suggest: 'Отжимания на брусьях' }] };
    const r = applyAdvice(d, 'a0', library);
    expect(names(r, 0)).toEqual(['Отжимания на брусьях']);
    expect(r.newExercises.map((e) => e.name)).toEqual(['Наклон к ногам']);
    expect(r.advice).toEqual([]);
    const arm = library.find((l) => l.id === 'arm-circles')!;
    const c = replaceExercise(base(), 'наклон к ногам', arm);
    expect(c.cooldown).toMatchObject({ items: [{ name: 'Вращение руками', sec: 45 }, { name: 'Вращение руками' }] });
    expect(names(replaceExercise(base(), 'жим лежа', dips), 1)).toEqual(['Отжимания на брусьях']);
  });

  it('applyAdvice without suggest only dismisses', () => {
    const d = applyAdvice(base(), 'a1', library);
    expect(d.advice.map((a) => a.id)).toEqual(['a0']);
    expect(d.blocks).toEqual(base().blocks);
  });

  it('dismissAdvice removes only that advice', () => {
    expect(dismissAdvice(base(), 'a0').advice.map((a) => a.id)).toEqual(['a1']);
  });

  it('removing last routine item keeps empty new routine', () => {
    let d = removeRoutineItem(base(), 'cooldown', 0);
    d = removeRoutineItem(d, 'cooldown', 0);
    expect(d.cooldown).toEqual({ kind: 'new', title: 'Растяжка', items: [] });
  });

  it('moveRoutineItem ignores out of range', () => {
    const d = base();
    expect(moveRoutineItem(d, 'cooldown', 0, -1)).toEqual(d);
    expect(moveRoutineItem(d, 'cooldown', 1, 1)).toEqual(d);
    expect(moveRoutineItem(d, 'warmup', 0, 1)).toEqual(d);
    expect(moveRoutineItem(d, 'cooldown', 0, 1).cooldown).toMatchObject({ items: [{ name: 'Вращение руками' }, { name: 'Наклон к ногам' }] });
  });

  it('patchRoutineItem and renameRoutine change only the new routine', () => {
    let d = patchRoutineItem(base(), 'cooldown', 1, 40);
    d = renameRoutine(d, 'cooldown', 'Заминка спины');
    expect(d.cooldown).toMatchObject({ title: 'Заминка спины', items: [{ sec: 45 }, { sec: 40, sides: ['вправо', 'влево'] }] });
    expect(renameRoutine(d, 'warmup', 'x').warmup).toEqual({ kind: 'library', slug: 'neck-shoulders' });
  });

  it('setRoutine then pruneNew drops exercises only the old routine used', () => {
    const d = pruneNew(setRoutine(base(), 'cooldown', { kind: 'library', slug: 'back-stretch' }));
    expect(d.newExercises.map((e) => e.name)).toEqual(['Отжимания с хлопком']);
  });

  it('usedNames lists blocks and new routines', () => {
    expect([...usedNames(base())].sort()).toEqual(['Вращение руками', 'Жим лёжа', 'Наклон к ногам', 'Отжимания с хлопком']);
  });

  it('keeps sets of a sets exercise after replace', () => {
    const d = replaceExercise(base(), 'Отжимания с хлопком', dips);
    expect((exercisesOf(d.blocks[0]!)[0] as SetsExercise).sets).toBe(3);
  });
  it('removeNew drops rows, routine items, advice and the entry', () => {
    let d = createExercise(base(), 'b2', 'Наклон к ногам');
    d = removeNew(d, 'Наклон к ногам');
    expect(names(d, 1)).toEqual(['Жим лёжа']);
    expect(d.cooldown).toMatchObject({ items: [{ name: 'Вращение руками' }] });
    expect(d.newExercises.map((e) => e.name)).toEqual(['Отжимания с хлопком']);
    const r = removeNew(base(), 'Отжимания с хлопком');
    expect(r.advice.map((a) => a.id)).toEqual(['a1']);
    // Блок без упражнений остаётся: его покажет проверка перед сохранением
    expect(exercisesOf(r.blocks[0]!)).toEqual([]);
  });
});
