import { describe, expect, it } from 'vitest';
import { LEAD_SEC, signalAt, timedView } from './signals';

/** Сигналы по секундам от нажатия «Старт» для упражнения на 20 с: отсчёт 0–5, работа 5–25 */
const timeline = (work: number) =>
  Array.from({ length: LEAD_SEC + work + 3 }, (_, e) => signalAt(work, e));

describe('signalAt', () => {
  it('отсчёт: короткий каждую секунду, на старте работы длинный', () => {
    expect(timeline(20).slice(0, 6)).toEqual(['short', 'short', 'short', 'short', 'short', 'long']);
  });

  it('середина работы тихая', () => {
    expect(timeline(20).slice(6, 20)).toEqual(Array(14).fill(null));
  });

  it('последние 5 с: короткий каждую секунду, в конце длинный', () => {
    expect(timeline(20).slice(20, 26)).toEqual(['short', 'short', 'short', 'short', 'short', 'long']);
  });

  it('после конца тишина', () => {
    expect(timeline(20).slice(26)).toEqual([null, null]);
  });

  it('короткое упражнение: финишные сигналы не повторяют сигналы отсчёта', () => {
    // работа 3 с: 5 — длинный на старте, 6 и 7 — короткие, 8 — длинный в конце
    expect(timeline(3).slice(0, 9)).toEqual([
      'short', 'short', 'short', 'short', 'short', 'long', 'short', 'short', 'long',
    ]);
  });
});

describe('timedView', () => {
  it('отсчёт: оранжевое кольцо и обратный счёт пяти секунд', () => {
    expect(timedView(20, 0)).toEqual({ phase: 'lead', seconds: 5, total: 5, alert: true, caption: 'старт через' });
    expect(timedView(20, 4)).toMatchObject({ phase: 'lead', seconds: 1 });
  });

  it('работа: обычное кольцо и остаток', () => {
    expect(timedView(20, 5)).toEqual({ phase: 'work', seconds: 20, total: 20, alert: false, caption: 'осталось' });
    expect(timedView(20, 19)).toMatchObject({ seconds: 6, alert: false });
  });

  it('последние 5 с: снова оранжевое кольцо и «финиш через»', () => {
    expect(timedView(20, 20)).toEqual({ phase: 'work', seconds: 5, total: 20, alert: true, caption: 'финиш через' });
    expect(timedView(20, 24)).toMatchObject({ seconds: 1, alert: true });
  });

  it('по окончании: ноль, фаза done', () => {
    expect(timedView(20, 25)).toMatchObject({ phase: 'done', seconds: 0, alert: false });
    expect(timedView(20, 99)).toMatchObject({ phase: 'done', seconds: 0 });
  });
});
