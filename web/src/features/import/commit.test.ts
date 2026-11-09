import { describe, expect, it } from 'vitest';
import type { TimedBlock } from '../../../../shared/types';
import { applyToStructure, buildCommit, commitExercise, musclesOf } from './commit';
import { libraryFixture } from './fixtures';
import { DEFAULT_OPTIONS } from './importPlan';
import { parseImport, type ParsedImport } from './parse';
import { EMPTY_CHOICES, setAction, setGroup, pickAllSimilar } from './preview';

const ctx = { library: libraryFixture, today: '2026-11-02', mine: { '2026-11-05': 'Всё тело' } };
const text = `version: 1
exercises:
  - id: reverse-pushup
    name: Обратные отжимания
    aliases: [обратка]
    muscles: [трицепс]
    measure: reps
    video: https://youtu.be/x
    notes: Таз неподвижен
workouts:
  - id: w1
    title: Первая
    date: 2026-11-03
    blocks:
      - type: warmup
        text: Скакалка
      - type: circuit
        rounds: 3
        exercises:
          - { exercise_id: reverse-pushup, reps: 10 }
          - { name: Подтягивания с резинкой, reps: 5 }
          - { name: Лодочка, time: 30s }
  - title: Вторая
    date: 2026-11-05
    blocks:
      - type: sets
        exercises:
          - { name: Лодочка, time: 30s }
`;
const parsed = (() => {
  const r = parseImport(text, ctx);
  if (!r.ok) throw new Error(r.errors.map((e) => e.message).join());
  return r;
})() as ParsedImport;
const names = parsed.preview.newExercises.map((e) => e.name);

describe('buildCommit', () => {
  it('по умолчанию создаёт все новые упражнения со всеми полями', () => {
    const c = buildCommit(parsed, EMPTY_CHOICES, DEFAULT_OPTIONS);
    expect(names).toEqual(['Обратные отжимания', 'Подтягивания с резинкой', 'Лодочка']);
    expect(c.exercises[0]).toEqual({
      id: 'reverse-pushup', name: 'Обратные отжимания', aliases: ['обратка'], muscles: ['трицепс'], kind: 'reps', group: 'arms',
      notes: 'Таз неподвижен',
    });
    expect(c.exercises.map((e) => e.name)).toEqual(names);
    expect(c.exercises[2]).toMatchObject({ name: 'Лодочка', kind: 'time', muscles: [], group: 'other' });
  });
  it('тренировки с id из файла и без, блоки как на проверке', () => {
    const c = buildCommit(parsed, EMPTY_CHOICES, DEFAULT_OPTIONS);
    expect(c.workouts.map((w) => [w.id, w.title])).toEqual([['w1', 'Первая'], [undefined, 'Вторая']]);
    expect(c.workouts[0]!.blocks.map((b) => [b.kind, b.heading])).toEqual([['warmup', 'Разминка'], ['exercises', 'Круг · 3 раунда']]);
    expect(c.workouts[0]!.blocks[0]).toMatchObject({ text: 'Скакалка', items: [] });
    expect(c.workouts[1]!.blocks[0]!.items).toEqual([{ name: 'Лодочка', value: '30 с' }]);
  });
  it('записи плана: даты и номера тренировок; конфликт «Заменить» попадает в replaceDates', () => {
    const c = buildCommit(parsed, EMPTY_CHOICES, DEFAULT_OPTIONS);
    expect(c.entries).toEqual([{ date: '2026-11-03', workout: 0 }, { date: '2026-11-05', workout: 1 }]);
    expect(c.replaceDates).toEqual(['2026-11-05']);
  });
  it('«Оставить мою» и «Оставить обе» не заменяют день', () => {
    const keep = buildCommit(parsed, EMPTY_CHOICES, { ...DEFAULT_OPTIONS, resolutions: { '2026-11-05': 'keep' } });
    expect(keep.entries).toEqual([{ date: '2026-11-03', workout: 0 }]);
    expect(keep.replaceDates).toEqual([]);
    const both = buildCommit(parsed, EMPTY_CHOICES, { ...DEFAULT_OPTIONS, resolutions: { '2026-11-05': 'both' } });
    expect(both.entries).toHaveLength(2);
    expect(both.replaceDates).toEqual([]);
  });
  it('«Не создавать» убирает упражнение и из списка, и из тренировок', () => {
    const c = buildCommit(parsed, setAction(EMPTY_CHOICES, parsed.preview.newExercises[2]!.key, 'skip'), DEFAULT_OPTIONS);
    expect(c.exercises.map((e) => e.name)).toEqual(['Обратные отжимания', 'Подтягивания с резинкой']);
    expect(c.workouts[0]!.blocks[1]!.items.map((i) => i.name)).toEqual(['Обратные отжимания', 'Подтягивания с резинкой']);
    expect(c.workouts[1]!.blocks[0]!.items).toEqual([]);
  });
  it('«Использовать похожее» подменяет название и не создаёт упражнение', () => {
    const c = buildCommit(parsed, pickAllSimilar(EMPTY_CHOICES, parsed.preview.newExercises), DEFAULT_OPTIONS);
    expect(c.exercises.map((e) => e.name)).toEqual(['Лодочка']);
    expect(c.workouts[0]!.blocks[1]!.items.map((i) => i.name)).toEqual(['Отжимания', 'Подтягивания', 'Лодочка']);
  });
  it('группа мышц с проверки становится мышцей и разделом', () => {
    const lodochka = parsed.preview.newExercises[2]!;
    const choices = setGroup(EMPTY_CHOICES, lodochka.key, 'Пресс');
    expect(musclesOf(lodochka, choices)).toEqual(['пресс']);
    expect(commitExercise(lodochka, choices)).toMatchObject({ muscles: ['пресс'], group: 'core' });
    expect(musclesOf(parsed.preview.newExercises[0]!, choices)).toEqual(['трицепс']);
  });
  it('distance в библиотеке считается как time', () => {
    const r = parseImport('version: 1\nworkouts:\n  - title: Т\n    date: 2026-11-03\n    blocks:\n      - type: sets\n        exercises:\n          - { name: Бег, distance: 5km }\n', ctx) as ParsedImport;
    expect(buildCommit(r, EMPTY_CHOICES, DEFAULT_OPTIONS).exercises[0]).toMatchObject({ name: 'Бег', kind: 'time' });
  });

  it('блоки для экрана тренировки отправляются вместе с тренировкой', () => {
    const c = buildCommit(parsed, EMPTY_CHOICES, DEFAULT_OPTIONS);
    expect(c.workouts[0]!.structure!.map((b) => b.mode)).toEqual(['timed', 'circuit']);
    expect(c.workouts[1]!.structure!.map((b) => b.mode)).toEqual(['sets']);
  });
  it('в блоках экрана тренировки «Не создавать» и «Использовать похожее» работают так же', () => {
    const skip = buildCommit(parsed, setAction(EMPTY_CHOICES, parsed.preview.newExercises[2]!.key, 'skip'), DEFAULT_OPTIONS);
    const circuit = skip.workouts[0]!.structure![1] as { exercises: Array<{ name: string }> };
    expect(circuit.exercises.map((e) => e.name)).toEqual(['Обратные отжимания', 'Подтягивания с резинкой']);
    // У второй тренировки остался один блок с одним упражнением; убрали его — блока нет, структуры нет
    expect(skip.workouts[1]!.structure).toBeUndefined();
    const use = buildCommit(parsed, pickAllSimilar(EMPTY_CHOICES, parsed.preview.newExercises), DEFAULT_OPTIONS);
    expect((use.workouts[0]!.structure![1] as { exercises: Array<{ name: string }> }).exercises.map((e) => e.name)).toEqual(['Отжимания', 'Подтягивания', 'Лодочка']);
  });
});

describe('наборы разминки на проверке', () => {
  const routineText = `version: 1
routines:
  - id: neck
    title: Шея
    exercises:
      - { name: Вращение тазом, time: 30s, per_side: true }
      - { name: Вращение плечами, time: 20s }
workouts:
  - { title: Т, date: 2026-11-03, blocks: [{ type: warmup, routine: neck }, { type: warmup, text: Скакалка }] }
`;
  const p = (() => {
    const r = parseImport(routineText, ctx);
    if (!r.ok) throw new Error(r.errors.map((e) => e.message).join());
    return r;
  })();
  const keyOf = (name: string) => p.preview.newExercises.find((e) => e.name === name)!.key;
  const timed = (c: ReturnType<typeof buildCommit>, i = 0) => c.workouts[0]!.structure![i] as TimedBlock;

  it('«Не создавать» убирает упражнение из набора', () => {
    const c = buildCommit(p, setAction(EMPTY_CHOICES, keyOf('Вращение тазом'), 'skip'), DEFAULT_OPTIONS);
    expect(timed(c).exercises.map((e) => e.name)).toEqual(['Вращение плечами']);
  });
  it('пустой набор исчезает, блок «Разминка» без списка остаётся', () => {
    const choices = setAction(setAction(EMPTY_CHOICES, keyOf('Вращение тазом'), 'skip'), keyOf('Вращение плечами'), 'skip');
    const c = buildCommit(p, choices, DEFAULT_OPTIONS);
    expect(c.workouts[0]!.structure).toHaveLength(1);
    expect(timed(c).exercises.map((e) => e.name)).toEqual(['Разминка']);
  });
  it('«Использовать похожее» подменяет название в timed-блоке', () => {
    const blocks = [{ id: 'b0', mode: 'timed', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Планка1', kind: 'time', target: { min: 30, max: 30 } }] }] as TimedBlock[];
    const out = applyToStructure(blocks, new Map([['Планка1', 'Планка']])) as TimedBlock[];
    expect(out[0]!.exercises[0]!.name).toBe('Планка');
  });
  it('блок «Разминка» без списка не затрагивается', () => {
    const block = { id: 'b0', mode: 'timed', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Разминка', kind: 'time', target: { min: 300, max: 300 } }] } as TimedBlock;
    expect(applyToStructure([block], new Map([['Планка', null]]))).toEqual([block]);
  });
  it('заголовок блока в blocks не врёт про время, пустой набор из blocks уходит', () => {
    const one = buildCommit(p, setAction(EMPTY_CHOICES, keyOf('Вращение тазом'), 'skip'), DEFAULT_OPTIONS);
    expect(one.workouts[0]!.blocks.map((b) => b.heading)).toEqual(['Разминка', 'Разминка']);
    const none = buildCommit(p, setAction(setAction(EMPTY_CHOICES, keyOf('Вращение тазом'), 'skip'), keyOf('Вращение плечами'), 'skip'), DEFAULT_OPTIONS);
    expect(none.workouts[0]!.blocks).toHaveLength(1);
    expect(buildCommit(p, EMPTY_CHOICES, DEFAULT_OPTIONS).workouts[0]!.blocks[0]!.heading).toBe('Разминка · 1:20');
  });
  it('sides доходят до отправки', () => {
    expect(timed(buildCommit(p, EMPTY_CHOICES, DEFAULT_OPTIONS)).exercises[0]!.sides).toEqual(['вправо', 'влево']);
  });
});
