import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { warmup } from './fixtures';
import { LEAD_SEC } from './signals';
import { ROUTINE_FINAL_SEC, routineLeadSec, routineSignalAt, routineSpeechAt, routineView } from './routine';

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('routineLeadSec', () => {
  it('отсчёт только у первого шага блока', () => {
    const steps = buildSteps([warmup]);
    expect(routineLeadSec(steps[0])).toBe(LEAD_SEC);
    expect(routineLeadSec(steps[1])).toBe(0);
  });
});

describe('routineSignalAt', () => {
  it('ROUTINE_FINAL_SEC равно трём', () => {
    expect(ROUTINE_FINAL_SEC).toBe(3);
  });

  it('в отсчёте перед стартом короткие сигналы, на старте длинный', () => {
    for (const e of range(0, 4)) expect(routineSignalAt(30, e, 5)).toBe('short');
    expect(routineSignalAt(30, 5, 5)).toBe('long');
  });

  it('в работе тишина до последних трёх секунд', () => {
    for (const e of range(6, 31)) expect(routineSignalAt(30, e, 5)).toBeNull();
  });

  it('последние три секунды и смена', () => {
    for (const e of range(32, 34)) expect(routineSignalAt(30, e, 5)).toBe('short');
    expect(routineSignalAt(30, 35, 5)).toBe('long');
  });

  it('после конца тишина', () => {
    expect(routineSignalAt(30, 36, 5)).toBeNull();
  });

  it('без отсчёта (leadSec 0) сигнала на нулевой секунде нет', () => {
    expect(routineSignalAt(30, 0, 0)).toBeNull();
    expect(routineSignalAt(30, 27, 0)).toBe('short');
    expect(routineSignalAt(30, 30, 0)).toBe('long');
  });

  it('короткое упражнение: 3 с без отсчёта', () => {
    expect(range(0, 4).map((e) => routineSignalAt(3, e, 0))).toEqual(['short', 'short', 'short', 'long', null]);
  });

  it('короткое упражнение с отсчётом: финишные сигналы не начинаются до старта и не дублируют длинный', () => {
    // работа 3 с, отсчёт 5 с: 0–4 короткие, 5 длинный (старт), 6 и 7 короткие, 8 длинный (смена)
    expect(range(0, 9).map((e) => routineSignalAt(3, e, 5))).toEqual([
      'short', 'short', 'short', 'short', 'short', 'long', 'short', 'short', 'long', null,
    ]);
    // работа 2 с: старт 5 длинный, 6 короткий, 7 длинный
    expect(range(4, 8).map((e) => routineSignalAt(2, e, 5))).toEqual(['short', 'long', 'short', 'long', null]);
  });
});

describe('routineView', () => {
  it('отсчёт: оранжевое кольцо и «старт через»', () => {
    expect(routineView(30, 0, 5)).toEqual({ phase: 'lead', seconds: 5, total: 5, alert: true, caption: 'старт через' });
    expect(routineView(30, 4, 5)).toMatchObject({ phase: 'lead', seconds: 1 });
  });

  it('работа: остаток без тревоги', () => {
    expect(routineView(30, 5, 5)).toEqual({ phase: 'work', seconds: 30, total: 30, alert: false, caption: 'осталось' });
    expect(routineView(30, 31, 5)).toMatchObject({ seconds: 4, alert: false });
  });

  it('последние три секунды: «смена через»', () => {
    expect(routineView(30, 32, 5)).toEqual({ phase: 'work', seconds: 3, total: 30, alert: true, caption: 'смена через' });
    expect(routineView(30, 34, 5)).toMatchObject({ seconds: 1, alert: true });
  });

  it('по окончании: «время вышло»', () => {
    expect(routineView(30, 35, 5)).toEqual({ phase: 'done', seconds: 0, total: 30, alert: false, caption: 'время вышло' });
  });

  it('без отсчёта сразу работа', () => {
    expect(routineView(30, 0, 0)).toMatchObject({ phase: 'work', seconds: 30, alert: false });
  });
});

describe('routineSpeechAt', () => {
  it('первый шаг набора называет себя в начале отсчёта', () => {
    expect(routineSpeechAt(30, 0, 5, true)).toBe('self');
    expect(routineSpeechAt(30, 0, 5, false)).toBe('self');
    expect(routineSpeechAt(30, 1, 5, true)).toBeNull();
  });
  it('следующее упражнение называется за 6 с до смены', () => {
    expect(routineSpeechAt(30, 24, 0, true)).toBe('next');
    expect(routineSpeechAt(30, 23, 0, true)).toBeNull();
    expect(routineSpeechAt(30, 25, 0, true)).toBeNull();
  });
  it('у первого шага момент смещён на отсчёт', () => {
    expect(routineSpeechAt(30, 29, 5, true)).toBe('next');
  });
  it('шаг короче 8 с не озвучивается', () => {
    expect(routineSpeechAt(7, 1, 0, true)).toBeNull();
    expect(routineSpeechAt(8, 2, 0, true)).toBe('next');
  });
  it('после последнего шага набора фразы нет', () => {
    for (let e = 1; e <= 40; e++) expect(routineSpeechAt(30, e, 0, false)).toBeNull();
  });
});
