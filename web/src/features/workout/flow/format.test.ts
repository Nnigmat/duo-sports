import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { blockLabel, editEyebrow, eyebrow, formatPlan, formatTarget, recordingEyebrow, restEyebrow, formatTime, stepLine, timerSeconds } from './format';
import { circuit, setsBlock, warmup } from './fixtures';

describe('formatTime', () => {
  it('мм:сс', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(30)).toBe('00:30');
    expect(formatTime(95)).toBe('01:35');
  });
});

describe('formatPlan', () => {
  it('reps: диапазон через длинное тире', () => {
    expect(formatPlan('reps', { target: { min: 18, max: 20 } })).toBe('18–20 повт');
  });
  it('reps: одно значение', () => {
    expect(formatPlan('reps', { target: { min: 15, max: 15 } })).toBe('15 повт');
  });
  it('weight: вес × повторы', () => {
    expect(formatPlan('weight', { target: { min: 10, max: 10 }, weight: 60 })).toBe('60 кг × 10');
  });
  it('weight: дробный вес с запятой и диапазон повторов', () => {
    expect(formatPlan('weight', { target: { min: 10, max: 12 }, weight: 12.5 })).toBe('12,5 кг × 10–12');
  });
  it('time: мм:сс, диапазон тоже', () => {
    expect(formatPlan('time', { target: { min: 45, max: 45 } })).toBe('00:45');
    expect(formatPlan('time', { target: { min: 45, max: 60 } })).toBe('00:45–01:00');
  });
});

describe('formatTarget', () => {
  it('число или диапазон без единицы: подсказка «План: …»', () => {
    expect(formatTarget('reps', { min: 18, max: 20 })).toBe('18–20');
    expect(formatTarget('weight', { min: 12, max: 12 })).toBe('12');
    expect(formatTarget('time', { min: 45, max: 60 })).toBe('00:45–01:00');
  });
});

describe('timerSeconds', () => {
  it('таймер берёт верх диапазона', () => {
    expect(timerSeconds({ target: { min: 45, max: 60 } })).toBe(60);
  });
});

describe('подписи шага', () => {
  const c = buildSteps([circuit]);
  const s = buildSteps([setsBlock]);
  const w = buildSteps([warmup]);

  it('stepLine: имя · план', () => {
    expect(stepLine(c[0])).toBe('Обратные отжимания · 18–20 повт');
    expect(stepLine(s[0])).toBe('Приседания · 12 кг × 12');
    expect(stepLine(s[3])).toBe('Планка · 00:45–01:00');
  });
  it('eyebrow: подход или упражнение', () => {
    expect(eyebrow(c[0])).toBe('Подход 1 из 9');
    expect(eyebrow(c[6])).toBe('Подход 7 из 9');
    expect(eyebrow(w[1])).toBe('Разминка · 2 из 2');
  });
  it('blockLabel: круг, «Подходами», название разминки', () => {
    expect(blockLabel(c[0])).toBe('Круг 1 из 3');
    expect(blockLabel(c[7])).toBe('Круг 3 из 3');
    expect(blockLabel(s[0])).toBe('Подходами');
    expect(blockLabel(w[0])).toBe('Разминка');
  });
});

describe('подписи по макету', () => {
  const w = buildSteps([warmup]);
  const c = buildSteps([circuit]);

  it('timed: название блока, номер и общее число; в строке только название упражнения', () => {
    expect(eyebrow(w[0])).toBe('Разминка · 1 из 2');
    expect(stepLine(w[0])).toBe('Вращения головой');
  });

  it('подход с записью: «снимаем на видео»', () => {
    expect(eyebrow(c[3])).toBe('Подход 4 из 9 · снимаем на видео');
    expect(eyebrow(c[0])).toBe('Подход 1 из 9');
  });

  it('отдых: какой подход следующий', () => {
    expect(restEyebrow(c[1])).toBe('Отдых · далее подход 2 из 9');
  });
});

describe('подписи панелей', () => {
  const c = buildSteps([circuit]);
  const w = buildSteps([setsBlock]);

  it('запись: круг и подход', () => {
    expect(recordingEyebrow(c[3])).toBe('Круг 2 · подход 4 из 9');
  });
  it('запись в блоке подходами: без круга', () => {
    expect(recordingEyebrow(w[1])).toBe('Подход 2 из 5');
  });
  it('«Изменить»: подход и круг', () => {
    expect(editEyebrow(c[0])).toBe('Подход 1 из 9 · круг 1');
    expect(editEyebrow(w[0])).toBe('Подход 1 из 5');
  });
});
