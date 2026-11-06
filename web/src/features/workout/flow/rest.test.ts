import { describe, expect, it } from 'vitest';
import { addRestGoal, isGoalReached, MAX_REST_SEC, restElapsedSec, restProgress, startRest } from './rest';

describe('отдых считает вверх', () => {
  it('в начале 0 секунд, цель не достигнута', () => {
    const r = startRest(60, 1000);
    expect(restElapsedSec(r, 1000)).toBe(0);
    expect(isGoalReached(r, 1000)).toBe(false);
  });

  it('секунды округляются вниз: «00:59» держится до самой цели', () => {
    const r = startRest(60, 0);
    expect(restElapsedSec(r, 59_999)).toBe(59);
    expect(isGoalReached(r, 59_999)).toBe(false);
  });

  it('на цели она достигнута, время идёт дальше', () => {
    const r = startRest(60, 0);
    expect(isGoalReached(r, 60_000)).toBe(true);
    expect(restElapsedSec(r, 72_400)).toBe(72);
  });

  it('забытый на сутки отдых не выходит за предел, который принимает сервер', () => {
    expect(restElapsedSec(startRest(60, 0), (MAX_REST_SEC + 5000) * 1000)).toBe(MAX_REST_SEC);
  });

  it('часы, ушедшие назад, не дают отрицательного времени', () => {
    expect(restElapsedSec(startRest(60, 5000), 1000)).toBe(0);
  });
});

describe('«+15» двигает цель', () => {
  it('добавляет секунды к цели, начало не трогает', () => {
    const r = addRestGoal(startRest(60, 0), 15);
    expect(r).toEqual({ goalSec: 75, startedAt: 0 });
  });

  it('после достижения цели «+15» снова делает отдых не достигнутым', () => {
    const r = startRest(60, 0);
    expect(isGoalReached(r, 65_000)).toBe(true);
    expect(isGoalReached(addRestGoal(r, 15), 65_000)).toBe(false);
  });
});

describe('доля кольца', () => {
  it('растёт от 0 до 1 и не выходит за 1 сверх цели', () => {
    const r = startRest(60, 0);
    expect(restProgress(r, 0)).toBe(0);
    expect(restProgress(r, 30_000)).toBe(0.5);
    expect(restProgress(r, 90_000)).toBe(1);
  });

  it('при нулевой цели кольцо полное', () => {
    expect(restProgress(startRest(0, 0), 0)).toBe(1);
  });
});
