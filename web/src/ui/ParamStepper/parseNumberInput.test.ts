import { describe, expect, it } from 'vitest';
import { parseNumberInput } from './parseNumberInput';

const free = (n: number) => n;
const upTo100 = (n: number) => Math.min(100, n);

describe('parseNumberInput', () => {
  it('принимает запятую как точку', () => expect(parseNumberInput('7,5', free)).toBe(7.5));
  it('пустая строка даёт null', () => expect(parseNumberInput('', free)).toBeNull());
  it('не-число даёт null', () => expect(parseNumberInput('abc', free)).toBeNull());
  it('отвергает экспоненту и hex', () => {
    expect(parseNumberInput('1e3', free)).toBeNull();
    expect(parseNumberInput('0x10', free)).toBeNull();
  });
  it('результат проходит clamp', () => expect(parseNumberInput('999', upTo100)).toBe(100));
  it('обрезает пробелы', () => expect(parseNumberInput(' 12 ', free)).toBe(12));
});
