import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, formatReps, formatWeight, parseDistance, parseDo, parseDuration, parseReps, parseWeight } from './units';

describe('повторы', () => {
  it('число, диапазон и max', () => {
    expect(parseReps(10)).toEqual({ min: 10, max: 10 });
    expect(parseReps('8-12')).toEqual({ min: 8, max: 12 });
    expect(parseReps('18–20')).toEqual({ min: 18, max: 20 });
    expect(parseReps('max')).toBe('max');
    expect(parseReps('MAX')).toBe('max');
  });
  it('мусор — null', () => {
    for (const bad of ['много', '12-8', '', 1.5, -1, null, '8-', '8-10-12']) expect(parseReps(bad)).toBeNull();
  });
  it('показ', () => {
    expect(formatReps({ min: 18, max: 20 })).toBe('18–20');
    expect(formatReps({ min: 30, max: 30 })).toBe('30');
    expect(formatReps('max')).toBe('макс.');
  });
});

describe('время', () => {
  it('единицы и мм:сс', () => {
    expect(parseDuration(45)).toEqual({ min: 45, max: 45 });
    expect(parseDuration('45s')).toEqual({ min: 45, max: 45 });
    expect(parseDuration('45')).toEqual({ min: 45, max: 45 });
    expect(parseDuration('2m')).toEqual({ min: 120, max: 120 });
    expect(parseDuration('1h10m')).toEqual({ min: 4200, max: 4200 });
    expect(parseDuration('1:30')).toEqual({ min: 90, max: 90 });
  });
  it('диапазон с единицей на конце', () => {
    expect(parseDuration('5-7m')).toEqual({ min: 300, max: 420 });
    expect(parseDuration('7-5m')).toBeNull();
  });
  it('мусор — null', () => {
    for (const bad of ['быстро', '1:75', '', 'm', '5x']) expect(parseDuration(bad)).toBeNull();
  });
  it('показ: секунды, минуты, мм:сс, диапазоны', () => {
    expect(formatDuration({ min: 30, max: 30 })).toBe('30 с');
    expect(formatDuration({ min: 120, max: 120 })).toBe('2 мин');
    expect(formatDuration({ min: 90, max: 90 })).toBe('1:30');
    expect(formatDuration({ min: 300, max: 420 })).toBe('5–7 мин');
    expect(formatDuration({ min: 20, max: 30 })).toBe('20–30 с');
  });
});

describe('вес', () => {
  it('число, единица, запятая, диапазон', () => {
    expect(parseWeight(75)).toEqual({ min: 75, max: 75, unit: 'kg' });
    expect(parseWeight('75kg')).toEqual({ min: 75, max: 75, unit: 'kg' });
    expect(parseWeight('165lb')).toEqual({ min: 165, max: 165, unit: 'lb' });
    expect(parseWeight('7,5')).toEqual({ min: 7.5, max: 7.5, unit: 'kg' });
    expect(parseWeight('6-7', 'lb')).toEqual({ min: 6, max: 7, unit: 'lb' });
  });
  it('мусор — null', () => {
    for (const bad of ['тяжёлый', '75 фунтов', '7-6', '']) expect(parseWeight(bad)).toBeNull();
  });
  it('показ с единицей через пробел', () => {
    expect(formatWeight({ min: 75, max: 75, unit: 'kg' })).toBe('75 кг');
    expect(formatWeight({ min: 7.5, max: 9.5, unit: 'kg' })).toBe('7,5–9,5 кг');
  });
});

describe('расстояние', () => {
  it('разбор и показ', () => {
    expect(parseDistance('500m')).toEqual({ value: 500, unit: 'm' });
    expect(parseDistance('1.5mi')).toEqual({ value: 1.5, unit: 'mi' });
    expect(parseDistance('далеко')).toBeNull();
    expect(formatDistance({ value: 2, unit: 'km' })).toBe('2 км');
    expect(formatDistance({ value: 1.5, unit: 'mi' })).toBe('1,5 миль');
  });
});

describe('короткая запись do', () => {
  it('примеры со страницы «Формат»', () => {
    expect(parseDo('4x8 @ 75')).toEqual({ sets: 4, reps: { min: 8, max: 8 }, weight: { min: 75, max: 75, unit: 'kg' } });
    expect(parseDo('3x12')).toEqual({ sets: 3, reps: { min: 12, max: 12 } });
    expect(parseDo('3x8-12 @ 60')?.reps).toEqual({ min: 8, max: 12 });
    expect(parseDo('5x5 @ 225lb')?.weight?.unit).toBe('lb');
    expect(parseDo('3xmax')?.reps).toBe('max');
  });
  it('русская х и ×', () => {
    expect(parseDo('3х10')?.sets).toBe(3);
    expect(parseDo('3×10')?.reps).toEqual({ min: 10, max: 10 });
  });
  it('мусор — null', () => {
    for (const bad of ['8', 'x8', '0x8', '4x8 @ много', 4, '']) expect(parseDo(bad)).toBeNull();
  });
});
