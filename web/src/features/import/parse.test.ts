import { describe, expect, it } from 'vitest';
import { libraryFixture } from './fixtures';
import { EXAMPLE } from './format';
import { SAMPLE_YAML, sampleYaml } from './import';
import { buildPlan, DEFAULT_OPTIONS } from './importPlan';
import { parseImport, similarTo, type ParseContext, type ParseResult } from './parse';

const ctx: ParseContext = { library: libraryFixture, today: '2026-11-02', mine: { '2026-11-05': 'Всё тело' } };
const ok = (r: ParseResult) => {
  if (!r.ok) throw new Error(`ожидали успех: ${r.errors.map((e) => e.message).join('; ')}`);
  return r;
};
const fails = (text: string) => {
  const r = parseImport(text, ctx);
  if (r.ok) throw new Error('ожидали ошибку');
  return r.errors;
};
const wrap = (workout: string, extra = '') => `version: 1\n${extra}workouts:\n  - title: Т\n    date: 2026-11-03\n    blocks:\n${workout}`;

describe('пример со страницы «Формат»', () => {
  const r = ok(parseImport(EXAMPLE.join('\n'), ctx));
  it('одна тренировка во вторник, 3 ноября', () => {
    expect(r.preview.weeks).toHaveLength(1);
    const s = r.preview.weeks[0]!.sessions[0]!;
    expect(s.date).toBe('Вт, 3 нояб');
    expect(s.title).toBe('Трицепс, пресс, ноги');
    expect(s.blocks.map((b) => b.heading)).toEqual(['Разминка · 5–7 мин', 'Круг · 3 раунда', 'Заминка']);
    expect(s.blocks[0]!.text).toBe('Разогреться любым способом');
  });
  it('значения: диапазон, макс., время на сторону', () => {
    const items = r.preview.weeks[0]!.sessions[0]!.blocks[1]!.items;
    expect(items).toEqual([
      { name: 'Обратные отжимания от лавочки', value: '20–24' },
      { name: 'Подтягивание колен в висе', value: 'макс.' },
      { name: 'Боковая планка', value: '30 с · на сторону' },
    ]);
  });
  it('новые упражнения: описанное и два по названию; группа не указана у них', () => {
    expect(r.preview.newExercises.map((e) => [e.name, e.muscles, e.hasVideo])).toEqual([
      ['Обратные отжимания от лавочки', 'трицепс', true],
      ['Подтягивание колен в висе', '', false],
      ['Боковая планка', '', false],
    ]);
    expect(r.preview.newExercises.every((e) => e.usedIn === 1)).toBe(true);
    expect(r.preview.newExercises.map((e) => e.key)).toEqual(['e0', 'e1', 'e2']);
  });
  it('источник плана: неделя, день, конфликты с планом', () => {
    expect(r.plan).toMatchObject({ firstMonday: '2026-11-02', today: '2026-11-02', workouts: [{ week: 0, weekday: 1, title: 'Трицепс, пресс, ноги' }] });
    expect(buildPlan(r.plan, DEFAULT_OPTIONS).inCalendar).toBe(1);
  });
  it('сводка: дни и период', () => {
    expect(r.preview.days).toBe('Вт');
    expect(r.preview.period).toBe('3 нояб — 3 нояб');
    expect(r.preview.lines).toBe(EXAMPLE.length);
  });
});

describe('пример для вставки', () => {
  it('ближайшие вторник и четверг: тренировки впереди, шесть новых упражнений', () => {
    const r = ok(parseImport(SAMPLE_YAML, ctx));
    expect(r.preview.weeks[0]!.sessions.map((s) => [s.date, s.title, s.past])).toEqual([
      ['Вт, 3 нояб', 'Трицепс, пресс, ноги', false],
      ['Чт, 5 нояб', 'Грудь, кор, спина', false],
    ]);
    expect(r.preview.weeks[0]!.range).toBe('2 – 8 нояб');
    expect(r.plan.workouts.map((w) => w.weekday)).toEqual([1, 3]);
    expect(r.preview.newExercises.map((e) => e.name)).toHaveLength(6);
    expect(r.preview.newExercises[0]!.similar).toBe('Отжимания');
  });
  it('в любой день недели даты примера не раньше сегодняшнего', () => {
    for (let d = 2; d <= 8; d++) {
      const today = `2026-11-0${d}`;
      const r = ok(parseImport(sampleYaml(today), { ...ctx, today }));
      expect(r.preview.weeks[0]!.sessions.every((s) => !s.past)).toBe(true);
    }
  });
});

describe('библиотека', () => {
  it('находит упражнение по названию без учёта регистра и ё, считает найденные', () => {
    const r = ok(parseImport(wrap('      - type: sets\n        exercises:\n          - { name: подтягивания, do: "3x8" }\n          - { exercise_id: plank, time: 45s }\n'), ctx));
    expect(r.preview.found).toBe(2);
    expect(r.preview.newExercises).toEqual([]);
    expect(r.preview.weeks[0]!.sessions[0]!.blocks[0]!.items).toEqual([
      { name: 'Подтягивания', value: '3 × 8' },
      { name: 'Планка', value: '45 с' },
    ]);
  });
  it('своё описание с названием из библиотеки не считается новым', () => {
    const r = ok(parseImport(wrap('      - type: sets\n        exercises:\n          - { exercise_id: my-plank, time: 30s }\n', 'exercises:\n  - { id: my-plank, name: Планка }\n'), ctx));
    expect(r.preview.newExercises).toEqual([]);
    expect(r.preview.found).toBe(1);
  });
  it('похожее: слова библиотечного названия входят в новое', () => {
    expect(similarTo('Подтягивания с резинкой', libraryFixture)).toBe('Подтягивания');
    expect(similarTo('Подтягивания', libraryFixture)).toBeUndefined();
    expect(similarTo('Лодочка', libraryFixture)).toBeUndefined();
    expect(similarTo('Боковая планка', libraryFixture)).toBe('Планка');
    const r = ok(parseImport(wrap('      - type: sets\n        exercises:\n          - { name: Подтягивания с резинкой, reps: 5 }\n'), ctx));
    expect(r.preview.newExercises[0]!.similar).toBe('Подтягивания');
  });
  it('считает, в скольких тренировках стоит упражнение', () => {
    const text = `version: 1\nworkouts:\n${[3, 5, 10].map((d) => `  - title: Т${d}\n    date: 2026-11-${String(d).padStart(2, '0')}\n    blocks:\n      - type: sets\n        exercises:\n          - { name: Лодочка, reps: 20 }\n          - { name: Лодочка, reps: 25 }\n`).join('')}`;
    expect(ok(parseImport(text, ctx)).preview.newExercises[0]!.usedIn).toBe(3);
  });
});

describe('нагрузка', () => {
  const load = (line: string, type = 'sets') =>
    ok(parseImport(wrap(`      - type: ${type}\n        exercises:\n          - { name: Подтягивания, ${line} }\n`), ctx)).preview.weeks[0]!.sessions[0]!.blocks[0]!.items[0]!.value;
  it('do, sets и reps, вес, время, расстояние', () => {
    expect(load('do: "4x8 @ 75"')).toBe('4 × 8 · 75 кг');
    expect(load('sets: 3, reps: "8-12", weight: 60')).toBe('3 × 8–12 · 60 кг');
    expect(load('reps: 12', 'circuit')).toBe('12');
    expect(load('time: "1:30"')).toBe('1:30');
    expect(load('distance: 2km')).toBe('2 км');
    expect(load('reps: 20, per_side: true')).toBe('20 · на сторону');
  });
  it('список sets: подходы разной нагрузки, разминочный помечен', () => {
    const text = wrap('      - type: sets\n        exercises:\n          - name: Подтягивания\n            sets:\n              - { reps: 15, weight: 60, warmup: true }\n              - { reps: 8, weight: 100 }\n');
    expect(ok(parseImport(text, ctx)).preview.weeks[0]!.sessions[0]!.blocks[0]!.items[0]!.value).toBe('15 × 60 кг (разминка), 8 × 100 кг');
  });
  it('lb из units и явная единица', () => {
    const t = (w: string) => wrap(`      - type: sets\n        exercises:\n          - { name: Подтягивания, do: "3x5 @ ${w}" }\n`, 'units: lb\n');
    expect(ok(parseImport(t('135'), ctx)).preview.weeks[0]!.sessions[0]!.blocks[0]!.items[0]!.value).toBe('3 × 5 · 135 lb');
  });
});

describe('ошибки со страницы «Формат»', () => {
  const ex = (line: string) => wrap(`      - type: sets\n        exercises:\n          - { name: Подтягивания, ${line} }\n`);
  it('reps не число', () => {
    const [e] = fails(ex('reps: много'));
    expect(e).toMatchObject({ message: 'reps должно быть числом или диапазоном', hint: 'Пишите 10 или "8-12" — без слов и единиц.', line: 8 });
  });
  it('нет нагрузки', () => {
    expect(fails(ex('notes: привет'))[0]).toMatchObject({ message: 'У упражнения нет нагрузки', hint: 'Добавьте do, reps, time или distance.', line: 8 });
  });
  it('неизвестный exercise_id', () => {
    const [e] = fails(wrap('      - type: sets\n        exercises:\n          - { exercise_id: reverse-pushups, reps: 5 }\n'));
    expect(e!.message).toBe('Неизвестный exercise_id: reverse-pushups');
  });
  it('id повторяется', () => {
    const w = (id: string) => `  - id: ${id}\n    title: Т\n    blocks:\n      - { type: warmup, text: Разминка }\n`;
    expect(fails(`version: 1\nworkouts:\n${w('legs-a')}${w('legs-a')}`)[0]).toMatchObject({ message: 'id повторяется: legs-a', hint: 'У каждой тренировки в тексте свой id.' });
  });
  it('неверный отступ — с номером строки', () => {
    const [e] = fails('version: 1\nworkouts:\n  - title: Т\n   blocks: []\n');
    expect(e!.message).toMatch(/^Неверный отступ в строке \d+$/);
    expect(e!.hint).toContain('2 пробела');
  });
  it('таб вместо пробелов', () => {
    expect(fails('version: 1\nworkouts:\n\t- title: Т\n')[0]!.message).toMatch(/Таб вместо пробелов|Неверный отступ/);
  });
  it('schedule ссылается на неизвестную тренировку', () => {
    const text = `version: 1\nplan:\n  weeks: 2\n  schedule: { mon: upper-c }\nworkouts:\n  - id: upper-a\n    title: Т\n    blocks:\n      - { type: warmup, text: Р }\n`;
    expect(fails(text)[0]).toMatchObject({ message: 'В schedule неизвестная тренировка: upper-c', hint: 'В плане можно ссылаться только на id из workouts.' });
  });
  it('нет version, workouts, title, blocks; неверная дата и тип блока', () => {
    expect(fails('workouts: []\n').map((e) => e.message)).toEqual(['Нужно version: 1', 'Нужна хотя бы одна тренировка в workouts']);
    expect(fails('version: 1\nworkouts:\n  - date: вчера\n    blocks: []\n').map((e) => e.message)).toEqual(['У тренировки нет title', 'Неверная дата: вчера', 'У тренировки нет blocks']);
    expect(fails(wrap('      - type: yoga\n'))[0]!.message).toBe('Неизвестный type: yoga');
  });
  it('пустой и слишком большой текст', () => {
    expect(fails('  \n')[0]!.message).toBe('Вставьте текст в формате YAML');
    expect(fails('a'.repeat(1024 * 1024 + 1))[0]!.message).toBe('Текст больше 1 МБ');
  });
  it('ошибки отсортированы по строкам и собраны все сразу', () => {
    const errs = fails(wrap('      - type: sets\n        exercises:\n          - { name: А, reps: x }\n          - { name: Б, reps: y }\n'));
    expect(errs.map((e) => e.line)).toEqual([...errs.map((e) => e.line)].sort((a, b) => a! - b!));
    expect(errs).toHaveLength(2);
  });
});

describe('plan: повтор по дням недели', () => {
  const text = (schedule: string, extra = '') =>
    `version: 1\nplan:\n  start: 2026-11-02\n  weeks: 4\n  schedule: ${schedule}\n${extra}workouts:\n  - { id: a, title: Верх, blocks: [{ type: warmup, text: Р }] }\n  - { id: b, title: Ноги, blocks: [{ type: warmup, text: Р }] }\n`;
  it('один день недели повторяется все недели', () => {
    const r = ok(parseImport(text('{ mon: a, wed: b }'), ctx));
    expect(r.preview.weeks).toHaveLength(4);
    expect(r.plan.workouts).toHaveLength(8);
    expect(r.preview.days).toBe('Пн · Ср');
    expect(r.plan.workouts[0]).toEqual({ week: 0, weekday: 0, title: 'Верх', ref: 0 });
  });
  it('список недель берётся по кругу: программа A/B', () => {
    const r = ok(parseImport(text('[{ mon: a }, { mon: b }]'), ctx));
    expect(r.plan.workouts.map((w) => w.title)).toEqual(['Верх', 'Ноги', 'Верх', 'Ноги']);
  });
  it('без start — ближайший понедельник; тренировки без даты вне plan — предупреждение', () => {
    const r = ok(parseImport(text('{ tue: a }').replace('  start: 2026-11-02\n', ''), ctx));
    expect(r.plan.firstMonday).toBe('2026-11-02');
    expect(r.warnings.map((w) => w.message)).toEqual(['«Ноги» без даты']);
  });
  it('неверные weeks и день недели', () => {
    expect(fails(text('{ mon: a }').replace('weeks: 4', 'weeks: 99'))[0]!.message).toBe('plan.weeks — число недель от 1 до 52');
    expect(fails(text('{ mun: a }'))[0]!.message).toBe('Неизвестный день недели: mun');
  });
});

describe('предупреждения', () => {
  it('незнакомое поле и две тренировки на одну дату', () => {
    const w = (t: string) => `  - title: ${t}\n    date: 2026-11-03\n    blocks:\n      - { type: warmup, text: Р }\n`;
    const r = ok(parseImport(`version: 1\nмечта: да\nworkouts:\n${w('Первая')}${w('Вторая')}`, ctx));
    expect(r.warnings.map((x) => x.message)).toEqual(['Незнакомое поле: мечта', 'На 3 нояб две тренировки из файла']);
    expect(r.warnings[1]!.hint).toBe('В календарь попадёт «Вторая».');
    expect(r.preview.weeks[0]!.sessions).toHaveLength(1);
    expect(r.preview.warnings).toEqual(['Строка 2: Незнакомое поле: мечта', 'Строка 8: На 3 нояб две тренировки из файла']);
  });
  it('недели с пропусками: неделя без тренировок не показывается', () => {
    const w = (d: string) => `  - title: Т\n    date: ${d}\n    blocks:\n      - { type: warmup, text: Р }\n`;
    const r = ok(parseImport(`version: 1\nworkouts:\n${w('2026-11-03')}${w('2026-11-24')}`, ctx));
    expect(r.preview.weeks.map((x) => x.range)).toEqual(['2 – 8 нояб', '23 – 29 нояб']);
    expect(r.plan.workouts.map((x) => x.week)).toEqual([0, 3]);
  });
});

describe('блоки для экрана тренировки', () => {
  const structureOf = (yaml: string) => ok(parseImport(yaml, ctx)).workouts.map((w) => w.structure);
  it('пример со страницы «Формат»: разминка, круг, заминка', () => {
    const [blocks] = structureOf(EXAMPLE.join('\n'));
    expect(blocks!.map((b) => [b.id, b.mode, b.title])).toEqual([['b0', 'timed', 'Разминка'], ['b1', 'circuit', 'Круг'], ['b2', 'timed', 'Заминка']]);
    expect(blocks![0]).toMatchObject({ note: 'Разогреться любым способом' });
    const circuit = blocks![1] as { rounds: number; restSec: number; exercises: Array<{ name: string; kind: string; target: unknown }> };
    expect([circuit.rounds, circuit.restSec]).toEqual([3, 60]);
    expect(circuit.exercises.map((e) => [e.name, e.kind, e.target])).toEqual([
      ['Обратные отжимания от лавочки', 'reps', { min: 20, max: 24 }],
      ['Подтягивание колен в висе', 'reps', { min: 0, max: 0 }],
      ['Боковая планка', 'time', { min: 30, max: 30 }],
    ]);
  });
  it('sets: do, вес, отдых из блока и из упражнения', () => {
    const [a] = structureOf(wrap('      - type: sets\n        rest: 2m\n        exercises:\n          - { name: Подтягивания, do: "4x8 @ 75" }\n'));
    expect(a![0]).toMatchObject({ mode: 'sets', restSec: 120, exercises: [{ name: 'Подтягивания', kind: 'weight', weight: 75, sets: 4, target: { min: 8, max: 8 } }] });
    const [b] = structureOf(wrap('      - type: sets\n        exercises:\n          - { name: Подтягивания, sets: 3, reps: 10, rest: 45s }\n'));
    expect(b![0]).toMatchObject({ restSec: 45, exercises: [{ kind: 'reps', sets: 3 }] });
  });
  it('время разминки с диапазоном и lb в килограммах', () => {
    const [blocks] = structureOf(wrap('      - { type: warmup, time: 5-7m, text: Скакалка }\n      - type: circuit\n        rounds: 2\n        exercises:\n          - { name: Подтягивания, reps: 5, weight: 135lb }\n'));
    expect(blocks![0]).toMatchObject({ mode: 'timed', exercises: [{ target: { min: 300, max: 420 } }] });
    expect(blocks![1]).toMatchObject({ rounds: 2, exercises: [{ kind: 'weight', weight: 61 }] });
  });
  it('пирамида: подходы с разным весом становятся разными упражнениями', () => {
    const [blocks] = structureOf(wrap('      - type: sets\n        exercises:\n          - name: Подтягивания\n            sets:\n              - { reps: 15, weight: 60, warmup: true }\n              - { reps: 8, weight: 100 }\n'));
    expect((blocks![0] as { exercises: unknown[] }).exercises).toHaveLength(2);
  });
  it('неверный отдых — ошибка с номером строки', () => {
    const [e] = fails(wrap('      - type: sets\n        rest: долго\n        exercises:\n          - { name: Подтягивания, reps: 5 }\n'));
    expect(e).toMatchObject({ message: 'Не понимаю время отдыха: долго', line: 7 });
  });
  it('расстояние без времени: предупреждение, упражнение считается по времени', () => {
    const r = ok(parseImport(wrap('      - type: sets\n        exercises:\n          - { name: Бег, distance: 5km }\n'), ctx));
    expect(r.warnings.map((w) => w.message)).toEqual(['«Бег» посчитаем по времени']);
    expect(r.workouts[0]!.structure[0]).toMatchObject({ exercises: [{ kind: 'time', target: { min: 300, max: 300 } }] });
  });
});
