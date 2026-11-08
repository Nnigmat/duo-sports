import { describe, expect, it } from 'vitest';
import type { SessionStepResult } from '../shared/types';
import { recordsOf, weeklyVolumes, type ProgressSession } from './progress';

const NB = ' ';
const w = (name: string, weight: number, reps: number, over: Partial<SessionStepResult> = {}): SessionStepResult => ({
  exerciseId: name, exerciseName: name, blockIndex: 0, round: 1, rounds: 1, kind: 'weight', plan: { target: { min: reps, max: reps }, weight }, completed: true, ...over,
});
const t = (name: string, sec: number): SessionStepResult => ({ ...w(name, 0, 0), kind: 'time', plan: { target: { min: sec, max: sec } } });
const r = (name: string, reps: number): SessionStepResult => ({ ...w(name, 0, reps), kind: 'reps', plan: { target: { min: reps, max: reps } } });
const s = (date: string, ...steps: SessionStepResult[]): ProgressSession => ({ date, steps });

describe('weeklyVolumes', () => {
  it('тонны по неделям с понедельника, старые первыми, пустые недели нулём', () => {
    // 2026-11-04 — среда; неделя с 2026-11-02
    const out = weeklyVolumes([s('2026-11-03', w('Присед', 100, 10)), s('2026-11-01', w('Жим', 50, 20)), s('2026-10-14', w('Присед', 80, 5))], '2026-11-04', 4);
    expect(out).toEqual([
      { weekStart: '2026-10-12', tons: 0.4 },
      { weekStart: '2026-10-19', tons: 0 },
      { weekStart: '2026-10-26', tons: 1 },
      { weekStart: '2026-11-02', tons: 1 },
    ]);
  });
  it('невыполненные подходы и тренировки вне окна не считаются', () => {
    const out = weeklyVolumes([s('2026-11-03', w('Присед', 100, 10, { completed: false })), s('2026-08-01', w('Присед', 100, 10))], '2026-11-04', 2);
    expect(out.map((x) => x.tons)).toEqual([0, 0]);
  });
});

describe('Факт в объёме и рекордах', () => {
  const act = (st: SessionStepResult, actual: SessionStepResult['actual']): SessionStepResult => ({ ...st, actual });
  it('объём по факту: вес и повторы из факта, без факта из плана', () => {
    const out = weeklyVolumes([s('2026-11-03', act(w('Присед', 100, 10), { value: 8, weight: 90 }), w('Жим', 50, 10))], '2026-11-04', 1);
    expect(out[0]!.tons).toBe(1.2); // 90 × 8 + 50 × 10
  });
  it('«Был доп. вес» не меняет вес в объёме', () => {
    const out = weeklyVolumes([s('2026-11-03', act(w('Присед', 100, 10), { value: 10, weight: 100, extraWeight: true }))], '2026-11-04', 1);
    expect(out[0]!.tons).toBe(1);
  });
  it('факт 0 повторов считается нулём, а не откатывается к плану', () => {
    const out = weeklyVolumes([s('2026-11-03', act(w('Присед', 100, 10), { value: 0, weight: 100 }))], '2026-11-04', 1);
    expect(out[0]!.tons).toBe(0);
  });
  it('рекорд по факту, а не по плану', () => {
    const { records } = recordsOf([s('2026-10-01', w('Присед', 80, 5)), s('2026-10-10', act(w('Присед', 80, 5), { value: 7, weight: 85 }))], '2026-11-02');
    expect(records).toEqual([{ exerciseName: 'Присед', label: `85${NB}кг × 7`, date: '2026-10-10' }]);
  });
  it('факт ниже плана не побивает рекорд плана прошлого Итога', () => {
    const { records, recordsMonth } = recordsOf([s('2026-10-01', w('Присед', 80, 5)), s('2026-10-10', act(w('Присед', 80, 5), { value: 3, weight: 80 }))], '2026-11-02');
    expect(records).toEqual([{ exerciseName: 'Присед', label: `80${NB}кг × 5`, date: '2026-10-01' }]);
    expect(recordsMonth).toBe(0);
  });
  it('время в секундах: факт планки против плана', () => {
    const { records } = recordsOf([s('2026-10-01', t('Планка', 60)), s('2026-10-02', act(t('Планка', 60), { value: 95 }))], '2026-11-02');
    expect(records[0]!.label).toBe('1:35');
  });
  it('повторы: факт против плана', () => {
    const { records } = recordsOf([s('2026-10-01', r('Отжимания', 18), act(r('Отжимания', 18), { value: 22 }))], '2026-11-02');
    expect(records[0]!.label).toBe(`22${NB}повт`);
  });
});

describe('recordsOf', () => {
  it('лучший подход: больший вес, при равном больше повторов; дата — когда впервые достигнут', () => {
    const { records } = recordsOf([s('2026-10-01', w('Присед', 80, 5)), s('2026-10-20', w('Присед', 80, 5), w('Присед', 80, 6)), s('2026-10-27', w('Присед', 80, 6)), s('2026-10-10', w('Присед', 70, 10))], '2026-11-02');
    expect(records).toEqual([{ exerciseName: 'Присед', label: `80${NB}кг × 6`, date: '2026-10-20' }]);
  });
  it('повторы и время; невыполненные не считаются; название без учёта регистра', () => {
    const { records } = recordsOf([s('2026-10-01', r('Отжимания', 18), t('Планка', 60), w('присед', 100, 5, { completed: false })), s('2026-10-02', r('отжимания', 20), t('Планка', 105), w('Присед', 60, 5))], '2026-11-02');
    expect(Object.fromEntries(records.map((x) => [x.exerciseName, x.label]))).toEqual({ Отжимания: `20${NB}повт`, Планка: '1:45', Присед: `60${NB}кг × 5` });
  });
  it('свежие рекорды первыми', () => {
    const { records } = recordsOf([s('2026-10-01', w('А', 10, 1)), s('2026-10-05', w('Б', 10, 1)), s('2026-10-03', w('В', 10, 1))], '2026-11-02');
    expect(records.map((x) => x.exerciseName)).toEqual(['Б', 'В', 'А']);
  });
  it('recordsMonth: улучшение прежнего результата за 30 дней; первый подход упражнения рекордом не считается', () => {
    const sessions = [
      s('2026-09-01', w('Присед', 70, 5), w('Жим', 50, 5)), // давно
      s('2026-10-10', w('Присед', 75, 5)), // улучшение
      s('2026-10-20', w('Присед', 80, 5), w('Станов', 90, 5)), // улучшение; у «Станов» первый раз
      s('2026-10-25', w('Присед', 80, 5)), // не лучше
    ];
    expect(recordsOf(sessions, '2026-11-02').recordsMonth).toBe(2);
    expect(recordsOf(sessions, '2026-12-30').recordsMonth).toBe(0);
  });
  it('recordsMonth: два улучшения одного упражнения за тренировку — один рекорд', () => {
    expect(recordsOf([s('2026-10-01', w('Присед', 70, 5)), s('2026-10-20', w('Присед', 80, 5), w('Присед', 80, 6))], '2026-11-02').recordsMonth).toBe(1);
  });
  it('лимит списка', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => s(`2026-10-${String(i + 1).padStart(2, '0')}`, w(`У${i}`, 10, 1)));
    expect(recordsOf(sessions, '2026-11-02', 8).records).toHaveLength(8);
  });
});
