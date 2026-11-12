import { describe, expect, it } from 'vitest';
import type { Block, SetsBlock } from '../../../../../shared/types';
import {
  addBlock, addExercise, changeMode, editableBlocks, moveBlock, moveExercise, patchExercise, problems, removeBlock, removeExercise, roundsOf, setRounds, setTarget, toggleVideoRound,
} from './draft';

const squat = { name: 'Присед', kind: 'weight' as const, defaults: { reps: 8, weight: 60, seconds: 30 } };
const plank = { name: 'Планка', kind: 'time' as const, defaults: { reps: 10, weight: 0, seconds: 45 } };
const sets = (): Block[] => addExercise(addBlock([], 'sets'), 'b1', squat);

describe('добавление', () => {
  it('блок получает свободный id и значения по режиму', () => {
    const blocks = addBlock(addBlock([], 'sets'), 'circuit');
    expect(blocks.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(blocks[1]).toMatchObject({ mode: 'circuit', rounds: 3, restSec: 60, videoRounds: [2] });
  });
  it('упражнение подставляет значения библиотеки; в «подходами» есть число подходов', () => {
    const [b] = sets() as SetsBlock[];
    expect(b.exercises[0]).toEqual({ id: 'x1', name: 'Присед', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 });
  });
  it('в таймерном блоке любое упражнение становится временным', () => {
    const [b] = addExercise(addBlock([], 'timed'), 'b1', squat);
    expect(b.exercises[0]).toMatchObject({ kind: 'time', target: { min: 30, max: 30 } });
    expect(b.exercises[0]).not.toHaveProperty('weight');
  });
  it('id не повторяются после удаления', () => {
    let blocks = addExercise(sets(), 'b1', plank);
    blocks = removeExercise(blocks, 'b1', 'x1');
    blocks = addExercise(blocks, 'b1', plank);
    expect(blocks[0].exercises.map((e) => e.id)).toEqual(['x2', 'x1']);
  });
});

describe('порядок и удаление', () => {
  it('двигает блоки и упражнения, на краю ничего не меняет', () => {
    const blocks = addBlock(sets(), 'timed');
    expect(moveBlock(blocks, 'b2', -1).map((b) => b.id)).toEqual(['b2', 'b1']);
    expect(moveBlock(blocks, 'b1', -1)).toEqual(blocks);
    const two = addExercise(sets(), 'b1', plank);
    expect(moveExercise(two, 'b1', 'x2', -1)[0].exercises.map((e) => e.id)).toEqual(['x2', 'x1']);
    expect(moveExercise(two, 'b1', 'x2', 1)).toEqual(two);
  });
  it('удаляет блок', () => {
    expect(removeBlock(sets(), 'b1')).toEqual([]);
  });
  it('не мутирует исходные блоки', () => {
    const before = sets();
    const snapshot = JSON.stringify(before);
    patchExercise(before, 'b1', 'x1', { sets: 5 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('режимы', () => {
  it('подходами → по кругу: упражнения остаются без числа подходов', () => {
    const [b] = changeMode(sets(), 'b1', 'circuit');
    expect(b).toMatchObject({ mode: 'circuit', rounds: 3 });
    expect(b.exercises[0]).not.toHaveProperty('sets');
    expect(b.exercises[0].id).toBe('x1');
  });
  it('по кругу → подходами: подходов по умолчанию 3', () => {
    const [b] = changeMode(changeMode(sets(), 'b1', 'circuit'), 'b1', 'sets') as SetsBlock[];
    expect(b.exercises[0].sets).toBe(3);
  });
  it('→ по таймеру: остаётся время, веса нет', () => {
    const [b] = changeMode(sets(), 'b1', 'timed');
    expect(b).toMatchObject({ mode: 'timed' });
    expect(b.exercises[0]).toMatchObject({ kind: 'time', target: { min: 60, max: 60 } });
    expect(b.exercises[0]).not.toHaveProperty('weight');
    expect(b).not.toHaveProperty('restSec');
  });
});

describe('круги для видео', () => {
  it('отмечает и снимает, держит по порядку', () => {
    let blocks = changeMode(sets(), 'b1', 'circuit');
    blocks = toggleVideoRound(toggleVideoRound(blocks, 'b1', 3), 'b1', 2);
    expect((blocks[0] as { videoRounds: number[] }).videoRounds).toEqual([2, 3]);
    blocks = toggleVideoRound(blocks, 'b1', 2);
    expect((blocks[0] as { videoRounds: number[] }).videoRounds).toEqual([3]);
  });
  it('убавленные круги убирают лишние отметки', () => {
    let blocks = changeMode(sets(), 'b1', 'circuit');
    blocks = setRounds(toggleVideoRound(blocks, 'b1', 3), 'b1', 2);
    expect((blocks[0] as { videoRounds: number[] }).videoRounds).toEqual([]);
  });
  it('roundsOf: подходы — максимум по упражнениям', () => {
    expect(roundsOf(patchExercise(sets(), 'b1', 'x1', { sets: 5 })[0])).toBe(5);
  });
});

describe('problems', () => {
  it('пустая тренировка, пустой блок и пустое название', () => {
    expect(problems('', [])).toEqual(['Введите название тренировки', 'Добавьте хотя бы один блок']);
    expect(problems('Верх', addBlock([], 'sets'))).toEqual(['В блоке «Подходами» нет упражнений']);
    expect(problems('Верх', sets())).toEqual([]);
  });
});

describe('setTarget', () => {
  it('«от» выше «до» поднимает «до», «до» ниже «от» опускает «от»', () => {
    const up = setTarget(sets(), 'b1', 'x1', 'min', 12);
    expect(up[0].exercises[0].target).toEqual({ min: 12, max: 12 });
    const down = setTarget(setTarget(sets(), 'b1', 'x1', 'max', 10), 'b1', 'x1', 'max', 6);
    expect(down[0].exercises[0].target).toEqual({ min: 6, max: 6 });
  });
});

describe('editableBlocks', () => {
  const block = (id: string, kind?: 'warmup' | 'cooldown'): Block => ({ id, mode: 'timed', title: id, exercises: [], ...(kind ? { kind } : {}) });
  const all = [block('w', 'warmup'), block('m'), block('c', 'cooldown')];

  it('убирает только подключённые ссылкой', () => {
    expect(editableBlocks(all, { warmup: { id: 'a', title: 'A' } }).map((b) => b.id)).toEqual(['m', 'c']);
    expect(editableBlocks(all, { warmup: { id: 'a', title: 'A' }, cooldown: { id: 'b', title: 'B' } }).map((b) => b.id)).toEqual(['m']);
  });
  it('без ссылок ничего не трогает', () => {
    expect(editableBlocks(all, undefined)).toHaveLength(3);
  });
});
