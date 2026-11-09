import { describe, expect, it } from 'vitest';
import { libraryFixture } from './fixtures';
import { parseImport } from './parse';
import { ALTERNATING, BLOCK_TYPES, ERRORS, EXAMPLE, EXERCISE_FIELDS, joinCode, NEW_EXERCISE_FIELDS, PLAN_FIELDS, PYRAMID, ROUTINE_EXAMPLE, ROUTINE_FIELDS, SECTIONS, SHORT_FORMS, splitCode, TOP_FIELDS, WORKOUT_FIELDS } from './format';
import { SAMPLE_YAML } from './import';

describe('splitCode', () => {
  it('отделяет комментарий в конце строки и убирает пробелы перед ним', () => {
    expect(splitCode(['rest: 90s       # после круга'])).toEqual([{ n: 1, code: 'rest: 90s', comment: '# после круга' }]);
  });
  it('строка-комментарий целиком сохраняет отступ кода', () => {
    expect(splitCode(['  # … ещё 29'])).toEqual([{ n: 1, code: '  ', comment: '# … ещё 29' }]);
  });
  it('обычная строка без комментария и нумерация с единицы', () => {
    const lines = splitCode(['a: 1', 'b: 2']);
    expect(lines.map((l) => [l.n, l.code, l.comment])).toEqual([[1, 'a: 1', ''], [2, 'b: 2', '']]);
  });
  it('решётка внутри значения без двойного пробела — не комментарий', () => {
    expect(splitCode(['tag: #1'])[0]).toMatchObject({ code: 'tag: #1', comment: '' });
  });
  it('пример склеивается обратно в текст с переводом строки в конце', () => {
    expect(joinCode(['a', 'b'])).toBe('a\nb\n');
  });
});

describe('содержимое страницы', () => {
  it('в таблицах нет повторов полей и всё заполнено', () => {
    for (const table of [TOP_FIELDS, WORKOUT_FIELDS, EXERCISE_FIELDS, NEW_EXERCISE_FIELDS, PLAN_FIELDS, ROUTINE_FIELDS]) {
      const names = table.map((r) => r.field);
      expect(new Set(names).size).toBe(names.length);
      for (const r of table) expect([r.field, r.value, r.description].every((x) => x.length > 0)).toBe(true);
    }
  });
  it('на верхнем уровне обязательны ровно два поля', () => {
    expect(TOP_FIELDS.filter((r) => r.flag?.kind === 'required').map((r) => r.field)).toEqual(['version', 'workouts']);
  });
  it('у каждого блока есть код и описание; типы не повторяются', () => {
    expect(BLOCK_TYPES.map((b) => b.type)).toEqual(['sets', 'circuit', 'superset', 'warmup | cooldown', 'warmup | cooldown + routine']);
    for (const b of BLOCK_TYPES) expect(b.code[0]).toMatch(/^- type: /);
  });
  it('якоря содержания уникальны', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(11);
  });
  it('примеры начинаются с правильных ключей', () => {
    expect(EXAMPLE[0]).toBe('version: 1');
    expect(SHORT_FORMS.map((s) => s.code)).toContain('4x8 @ 75');
    expect(PYRAMID.some((l) => l.includes('warmup: true'))).toBe(true);
    expect(ALTERNATING[0]).toBe('schedule:');
    expect(ERRORS.length).toBeGreaterThan(0);
  });
  it('пример на странице и пример для вставки начинаются одинаково', () => {
    expect(SAMPLE_YAML.startsWith(EXAMPLE[0]!)).toBe(true);
  });
});

describe('наборы разминки в справке', () => {
  it('пример набора разбирается без ошибок и даёт timed-блоки со сторонами', () => {
    const r = parseImport(ROUTINE_EXAMPLE.join('\n'), { library: libraryFixture, today: '2026-11-02', mine: {} });
    if (!r.ok) throw new Error(r.errors.map((e) => `${e.line}: ${e.message}`).join('; '));
    const list = r.workouts[0]!.structure as Array<{ mode: string; exercises: Array<{ sides?: string[] }> }>;
    const warmup = list[0];
    const cooldown = list[list.length - 1];
    expect(warmup!.mode).toBe('timed');
    expect(warmup!.exercises.some((e) => e.sides)).toBe(true);
    expect(cooldown!.mode).toBe('timed');
  });
  it('routines описан в верхнем уровне', () => {
    expect(TOP_FIELDS.map((r) => r.field)).toContain('routines');
  });
});
