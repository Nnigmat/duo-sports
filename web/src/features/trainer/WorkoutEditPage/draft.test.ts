import { describe, expect, it } from 'vitest';
import type { Block, SetsBlock, SetsExercise } from '../../../../../shared/types';
import { exercisesOf } from '../../../../../shared/blocks';
import {
  addBlock, addExercise, changeMode, clearSides, editableBlocks, moveBlock, moveExercise, newBlock, patchExercise, problems, removeBlock, removeExercise, roundsOf, setExerciseNote, setExerciseRest, setNoteText, setOpen,
  setRounds, setTarget, toggleVideoRound,
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
    expect(exercisesOf(b)[0]).toEqual({ id: 'x1', name: 'Присед', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3 });
  });
  it('в таймерном блоке любое упражнение становится временным', () => {
    const [b] = addExercise(addBlock([], 'timed'), 'b1', squat);
    expect(exercisesOf(b)[0]).toMatchObject({ kind: 'time', target: { min: 30, max: 30 } });
    expect(exercisesOf(b)[0]).not.toHaveProperty('weight');
  });
  it('id не повторяются после удаления', () => {
    let blocks = addExercise(sets(), 'b1', plank);
    blocks = removeExercise(blocks, 'b1', 'x1');
    blocks = addExercise(blocks, 'b1', plank);
    expect(exercisesOf(blocks[0]).map((e) => e.id)).toEqual(['x2', 'x1']);
  });
});

describe('порядок и удаление', () => {
  it('двигает блоки и упражнения, на краю ничего не меняет', () => {
    const blocks = addBlock(sets(), 'timed');
    expect(moveBlock(blocks, 'b2', -1).map((b) => b.id)).toEqual(['b2', 'b1']);
    expect(moveBlock(blocks, 'b1', -1)).toEqual(blocks);
    const two = addExercise(sets(), 'b1', plank);
    expect(exercisesOf(moveExercise(two, 'b1', 'x2', -1)[0]).map((e) => e.id)).toEqual(['x2', 'x1']);
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
    expect(exercisesOf(b)[0]).not.toHaveProperty('sets');
    expect(exercisesOf(b)[0].id).toBe('x1');
  });
  it('по кругу → подходами: подходов по умолчанию 3', () => {
    const [b] = changeMode(changeMode(sets(), 'b1', 'circuit'), 'b1', 'sets') as SetsBlock[];
    expect(b.exercises[0].sets).toBe(3);
  });
  it('→ по таймеру: остаётся время, веса нет', () => {
    const [b] = changeMode(sets(), 'b1', 'timed');
    expect(b).toMatchObject({ mode: 'timed' });
    expect(exercisesOf(b)[0]).toMatchObject({ kind: 'time', target: { min: 60, max: 60 } });
    expect(exercisesOf(b)[0]).not.toHaveProperty('weight');
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
    expect(exercisesOf(up[0])[0].target).toEqual({ min: 12, max: 12 });
    const down = setTarget(setTarget(sets(), 'b1', 'x1', 'max', 10), 'b1', 'x1', 'max', 6);
    expect(exercisesOf(down[0])[0].target).toEqual({ min: 6, max: 6 });
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

describe('v2: заметка, отдых, максимум, стороны', () => {
  const first = (blocks: Block[]) => exercisesOf(blocks[0])[0] as SetsExercise;
  const withSides = (blocks: Block[]) => patchExercise(blocks, 'b1', 'x1', { sides: ['влево', 'вправо'] });

  it('setExerciseRest пишет отдых упражнения в «подходами»', () => {
    expect(first(setExerciseRest(sets(), 'b1', 'x1', 120)).restSec).toBe(120);
  });
  it('setExerciseRest не трогает круг и таймер', () => {
    const circuit = changeMode(sets(), 'b1', 'circuit');
    expect(setExerciseRest(circuit, 'b1', 'x1', 120)).toEqual(circuit);
    const timed = changeMode(sets(), 'b1', 'timed');
    expect(setExerciseRest(timed, 'b1', 'x1', 120)).toEqual(timed);
  });
  it('setExerciseNote пишет заметку, пустая строка убирает поле', () => {
    const noted = setExerciseNote(sets(), 'b1', 'x1', 'пауза внизу');
    expect(first(noted).note).toBe('пауза внизу');
    expect(first(setExerciseNote(noted, 'b1', 'x1', ''))).not.toHaveProperty('note');
  });
  it('setOpen(true) ставит {0, 0}, setOpen(false) возвращает значение библиотеки', () => {
    const open = setOpen(sets(), 'b1', 'x1', true);
    expect(first(open).target).toEqual({ min: 0, max: 0 });
    expect(first(setOpen(open, 'b1', 'x1', false, squat.defaults)).target).toEqual({ min: 8, max: 8 });
  });
  it('setOpen(false) для времени берёт секунды, без библиотеки — 60 с', () => {
    const [b] = addExercise(addBlock([], 'timed'), 'b1', plank);
    const open = setOpen([b], 'b1', 'x1', true);
    expect(exercisesOf(setOpen(open, 'b1', 'x1', false, plank.defaults)[0])[0].target).toEqual({ min: 45, max: 45 });
    expect(exercisesOf(setOpen(open, 'b1', 'x1', false)[0])[0].target).toEqual({ min: 60, max: 60 });
  });
  it('clearSides убирает стороны, остальное остаётся', () => {
    const cleared = clearSides(withSides(sets()), 'b1', 'x1');
    expect(first(cleared)).not.toHaveProperty('sides');
    expect(first(cleared)).toMatchObject({ name: 'Присед', sets: 3 });
  });
  it('смена режима сохраняет заметку и стороны; отдых упражнения остаётся только в «подходами»', () => {
    const rich = setExerciseRest(setExerciseNote(withSides(sets()), 'b1', 'x1', 'медленно'), 'b1', 'x1', 120);
    const circuit = exercisesOf(changeMode(rich, 'b1', 'circuit')[0])[0];
    expect(circuit).toMatchObject({ note: 'медленно', sides: ['влево', 'вправо'] });
    expect(circuit).not.toHaveProperty('restSec');
    const timed = exercisesOf(changeMode(rich, 'b1', 'timed')[0])[0];
    expect(timed).toMatchObject({ note: 'медленно', sides: ['влево', 'вправо'] });
    expect(timed).not.toHaveProperty('restSec');
    const back = first(changeMode(changeMode(rich, 'b1', 'circuit'), 'b1', 'sets'));
    expect(back).toMatchObject({ note: 'медленно', sides: ['влево', 'вправо'], sets: 3 });
  });
  it('смена режима на круг даёт отдых после круга', () => {
    expect(changeMode(sets(), 'b1', 'circuit')[0]).toMatchObject({ mode: 'circuit', restAfter: 'round' });
    expect(changeMode(changeMode(sets(), 'b1', 'timed'), 'b1', 'circuit')[0]).toMatchObject({ restAfter: 'round' });
  });
  it('в таймерный блок «на максимум» не попадает: цель по умолчанию', () => {
    const [b] = addExercise(addBlock([], 'sets'), 'b1', plank);
    const open = setOpen([b], 'b1', 'x1', true);
    expect(exercisesOf(changeMode(open, 'b1', 'timed')[0])[0].target).toEqual({ min: 60, max: 60 });
  });
  it('режим не сбрасывает «на максимум» у упражнения на время', () => {
    const [b] = addExercise(addBlock([], 'timed'), 'b1', plank);
    const open = setOpen([b], 'b1', 'x1', true);
    expect(exercisesOf(changeMode(open, 'b1', 'circuit')[0])[0].target).toEqual({ min: 0, max: 0 });
  });
  it('new circuit rests after round', () => {
    expect(newBlock([], 'circuit')).toMatchObject({ mode: 'circuit', restAfter: 'round' });
    expect(newBlock([], 'sets')).not.toHaveProperty('restAfter');
  });
  it('блок-заметка: добавление и текст', () => {
    const blocks = addBlock([], 'note');
    expect(blocks[0]).toEqual({ id: 'b1', mode: 'note', title: 'Заметка', text: '' });
    expect(setNoteText(blocks, 'b1', 'Сделать замер')[0]).toMatchObject({ text: 'Сделать замер' });
  });
  it('note block without text is a problem', () => {
    expect(problems('Верх', addBlock(sets(), 'note'))).toEqual(['Заметка без текста']);
    expect(problems('Верх', setNoteText(addBlock(sets(), 'note'), 'b2', 'Замер'))).toEqual([]);
  });
  it('only note blocks is a problem', () => {
    expect(problems('Верх', setNoteText(addBlock([], 'note'), 'b1', 'Замер'))).toEqual(['Нужен хотя бы один блок с упражнениями']);
    expect(problems('Верх', [])).toEqual(['Добавьте хотя бы один блок']);
  });
  it('блок-заметка двигается наравне с остальными', () => {
    const blocks = addBlock(sets(), 'note');
    expect(moveBlock(blocks, 'b2', -1).map((b) => b.id)).toEqual(['b2', 'b1']);
  });
});
