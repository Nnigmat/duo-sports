import { describe, expect, it } from 'vitest';
import type { LibraryEntry } from '../../../../shared/types';
import { ALTERNATING, BLOCK_TYPES, ERRORS, EXAMPLE, EXERCISE_FIELDS, joinCode, NEW_EXERCISE_FIELDS, PLAN_FIELDS, PYRAMID, ROUTINE_EXAMPLE, ROUTINE_FIELDS, SECTIONS, splitCode, TOP_FIELDS, V1_NOTE, WORKOUT_FIELDS } from './format';
import { parseImport, type ParseContext } from './parse';
import { V1_FIELD_HINTS } from './v2';

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

const entry = (id: string, name: string, kind: LibraryEntry['kind']): LibraryEntry => ({ id, name, aliases: [], kind, group: 'back', muscles: [], equipment: [] });
/** Упражнения и наборы, на которые ссылаются примеры страницы */
const ctx: ParseContext = {
  library: [
    entry('pullup', 'Подтягивания', 'reps'),
    entry('pushup-handles', 'Отжимания на упорах', 'reps'),
    entry('dead-hang', 'Вис', 'time'),
    entry('hanging-knee-raise', 'Подъём коленей в висе', 'reps'),
    entry('db-curl-seated', 'Сгибание руки с гантелью сидя', 'weight'),
    entry('lunge', 'Выпады', 'reps'),
    entry('wrist-mobilization', 'Мобилизация запястья', 'reps'),
    entry('open-book', 'Открытая книга', 'reps'),
    entry('plank', 'Планка', 'time'),
    entry('bench-press', 'Жим лёжа', 'weight'),
  ],
  routines: [
    { id: 'warmup-common', kind: 'warmup', title: 'Общая разминка' },
    { id: 'cooldown-common', kind: 'cooldown', title: 'Общая заминка' },
  ],
  today: '2026-11-02',
  mine: {},
};

const parse = (text: string) => parseImport(text, ctx);
const errorsOf = (text: string) => {
  const r = parse(text);
  return r.ok ? [] : r.errors;
};
/** Фрагмент-блок (строки с «- type: …») → документ version: 2 с одной тренировкой */
const MAIN = ['- type: sets', '  exercises:', '    - { exercise_id: pullup, reps: 5 }'];
/** Разминке и заминке нужна основная часть: к ним дописывается блок sets */
/** Разминке, заминке и заметке нужен блок с упражнениями рядом: без него нет основной части */
const asDocument = (block: string[]): string => {
  const alone = ['- type: warmup', '- type: cooldown', '- type: note'];
  const blocks = block.every((l) => !alone.some((a) => l.startsWith(a))) ? block : [...block, ...MAIN];
  return `version: 2\nworkouts:\n  - title: Т\n    date: 2026-11-03\n    blocks:\n${blocks.map((l) => `      ${l}`).join('\n')}\n`;
};
const failure = (text: string): string => {
  const r = parse(text);
  return r.ok ? '' : r.errors.map((e) => `${e.path?.join('.') ?? e.line}: ${e.message} ${e.hint ?? ''}`).join('; ');
};

describe('every format example parses', () => {
  const documents: Array<[string, string]> = [
    ['пример страницы', joinCode(EXAMPLE)],
    ['пример наборов', joinCode(ROUTINE_EXAMPLE)],
    ['пирамида', asDocument(PYRAMID)],
    ...BLOCK_TYPES.map((b): [string, string] => [`блок ${b.type}`, asDocument(b.code)]),
    [
      'чередование недель',
      `version: 2\nworkouts:\n${['upper-a', 'upper-b', 'legs-a', 'legs-b'].map((id) => `  - { id: ${id}, title: ${id}, blocks: [{ type: sets, exercises: [{ exercise_id: pullup, reps: 5 }] }] }\n`).join('')}${joinCode(ALTERNATING)}`,
    ],
  ];
  it.each(documents)('%s', (_name, text) => {
    expect(failure(text)).toBe('');
  });
});

describe('частые ошибки', () => {
  const wrong = ERRORS.filter((e) => e.wrong);
  it('каждая ошибочная запись не разбирается', () => {
    for (const e of wrong) expect(errorsOf(asDocument(e.wrong!)).length, e.message).toBeGreaterThan(0);
  });
  it('на каждое поле v1 из разбора есть запись, и разбор называет то же поле v2', () => {
    for (const [field, hint] of Object.entries(V1_FIELD_HINTS)) {
      const e = ERRORS.find((x) => x.message === `Поле ${field} из version: 1`);
      expect(e, field).toBeDefined();
      expect(e!.fix).toContain(hint);
      expect(failure(asDocument(e!.wrong!)), field).toContain(hint);
    }
  });
});

describe('mentions v1 still read', () => {
  it('в содержимом есть строка про version: 1, описания v1 нет', () => {
    expect(V1_NOTE).toBe('Файлы с version: 1 тоже читаются');
    expect(EXAMPLE[0]).toBe('version: 2');
    expect(ROUTINE_EXAMPLE[0]).toBe('version: 2');
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
  it('на верхнем уровне обязательны ровно два поля, units нет', () => {
    expect(TOP_FIELDS.filter((r) => r.flag?.kind === 'required').map((r) => r.field)).toEqual(['version', 'workouts']);
    expect(TOP_FIELDS.some((r) => r.field === 'units')).toBe(false);
  });
  it('типы блоков v2 описаны, у каждого есть код', () => {
    expect(BLOCK_TYPES.map((b) => b.type)).toEqual(['sets', 'circuit', 'timed', 'warmup | cooldown', 'note']);
    for (const b of BLOCK_TYPES) expect(b.code[0]).toMatch(/^- type: /);
  });
  it('якоря содержания уникальны', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(11);
  });
  it('поля упражнения — поля v2, без do и per_side', () => {
    expect(EXERCISE_FIELDS.map((r) => r.field)).toEqual(['exercise_id', 'sets', 'reps', 'time_sec', 'weight_kg', 'rest_sec', 'sides', 'notes']);
  });
});
