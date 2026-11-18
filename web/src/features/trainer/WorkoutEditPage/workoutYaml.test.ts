import { describe, expect, it } from 'vitest';
import type { Block } from '../../../../../shared/types';
import type { LibraryExercise } from '../../exercises/types';
import { legacyCircuitWarnings, readEditorYaml, workoutFromYaml, workoutToYaml } from './workoutYaml';
import { exercisesOf } from '../../../../../shared/blocks';

const lib = (name: string, kind: LibraryExercise['kind']): LibraryExercise =>
  ({ id: name, name, kind, group: 'legs', muscles: [], equipment: [], defaults: { reps: 8, weight: 0, seconds: 30 }, sessionsTotal: 0, sessions: [], trend: [] }) as LibraryExercise;

const library = [lib('Присед', 'weight'), lib('Жим лёжа', 'weight'), lib('Планка', 'time'), lib('Отжимания', 'reps'), lib('Вращения плечами', 'time'), lib('Выпад', 'time'), lib('Заминка', 'time')];
const TODAY = '2026-11-09';

const blocks: Block[] = [
  {
    id: 'b0',
    mode: 'timed',
    kind: 'warmup',
    title: 'Разминка',
    exercises: [
      { id: 'b0-e0', name: 'Вращения плечами', kind: 'time', pose: 'stand', target: { min: 30, max: 30 } },
      { id: 'b0-e1', name: 'Выпад', kind: 'time', pose: 'stand', target: { min: 45, max: 45 }, sides: ['вправо', 'влево'] },
    ],
  },
  {
    id: 'b1',
    mode: 'sets',
    title: 'Подходами',
    restSec: 90,
    videoRounds: [3],
    exercises: [
      { id: 'b1-e0', name: 'Присед', kind: 'weight', target: { min: 8, max: 12 }, weight: 75, sets: 4, restSec: 120 },
      { id: 'b1-e1', name: 'Планка', kind: 'time', target: { min: 30, max: 45 }, sets: 3, restSec: 90 },
    ],
  },
  {
    id: 'b2',
    mode: 'circuit',
    title: 'Финишер',
    restSec: 60,
    rounds: 3,
    restAfter: 'round',
    videoRounds: [2],
    exercises: [{ id: 'b2-e0', name: 'Отжимания', kind: 'reps', target: { min: 0, max: 0 } }],
  },
  { id: 'b3', mode: 'timed', kind: 'cooldown', title: 'Заминка', exercises: [{ id: 'b3-e0', name: 'Заминка', kind: 'time', pose: 'stretch', target: { min: 300, max: 300 } }] },
];

describe('workoutToYaml', () => {
  it('пишет version: 2: exercise_id, time_sec, rest_sec; встроенные разминка и заминка остаются комментариями', () => {
    const text = workoutToYaml('Ноги', blocks, {}, library);
    expect(text).toContain('version: 2');
    expect(text).not.toContain('routine');
    expect(text).not.toContain('Вращения плечами');
    expect(text).toContain('# Разминка «Разминка» — правится в форме');
    expect(text).toContain('# Заминка «Заминка» — правится в форме');
    expect(text.indexOf('# Разминка')).toBeLessThan(text.indexOf('type: sets'));
    expect(text.indexOf('type: circuit')).toBeLessThan(text.indexOf('# Заминка'));
    expect(text).toContain('rest_sec: 120');
    expect(text).not.toMatch(/\bname:|\bdo:/);
    expect(text).toMatch(/video_rounds:\n\s+- 3/);
  });
});

describe('блок по таймеру в основной части', () => {
  const plank: Block[] = [{ id: 'b0', mode: 'timed', title: 'По таймеру', exercises: [{ id: 'b0-e0', name: 'Планка', kind: 'time', target: { min: 45, max: 45 } }] }];
  it('пишется как type: timed и читается обратно без kind', () => {
    const text = workoutToYaml('Кор', plank, {}, library);
    expect(text).toContain('type: timed');
    expect(text).not.toMatch(/warmup|cooldown/);
    expect(workoutFromYaml(text, library, plank, TODAY)).toEqual({ ok: true, title: 'Кор', blocks: plank, links: {} });
  });
  it('kind-less legacy warmup keeps pose', () => {
    const old: Block[] = [
      { id: 'b0', mode: 'timed', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Выпад', kind: 'time', pose: 'stand', target: { min: 30, max: 30 } }] },
      { id: 'b1', mode: 'timed', title: 'Растяжка', exercises: [{ id: 'b1-e0', name: 'Выпад', kind: 'time', pose: 'stretch', target: { min: 30, max: 30 } }] },
      { id: 'b2', mode: 'timed', title: 'Планка', exercises: [{ id: 'b2-e0', name: 'Планка', kind: 'time', target: { min: 45, max: 45 } }] },
    ];
    const text = workoutToYaml('Ноги', old, {}, library);
    expect(text).not.toContain('Выпад');
    expect(text.indexOf('# Разминка')).toBeLessThan(text.indexOf('type: timed'));
    expect(text).toContain('# Заминка «Растяжка»');
    const back = workoutFromYaml(text, library, old, TODAY);
    expect(back).toMatchObject({ ok: true });
    expect(back.ok && back.blocks.map((b) => b.id)).toEqual(['b0', 'b2', 'b1']);
    expect(back.ok && back.blocks[0]).toEqual(old[0]);
    expect(back.ok && back.blocks[2]).toEqual(old[1]);
  });
});

describe('встроенная разминка и заминка', () => {
  const main: Block = { id: 'b1', mode: 'sets', title: 'Силовая', restSec: 60, videoRounds: [], exercises: [{ id: 'b1-e0', name: 'Присед', kind: 'reps', target: { min: 5, max: 5 }, sets: 1 }] };
  const plainWarm: Block = { id: 'b0', mode: 'timed', kind: 'warmup', title: 'Разминка', exercises: [{ id: 'b0-e0', name: 'Разминка', kind: 'time', pose: 'stand', target: { min: 300, max: 300 } }] };
  const plainCool: Block = { id: 'b2', mode: 'timed', kind: 'cooldown', title: 'Заминка', exercises: [{ id: 'b2-e0', name: 'Заминка', kind: 'time', pose: 'stretch', target: { min: 240, max: 360 } }] };
  const all = [plainWarm, main, plainCool];

  it('v1 plain warmup/cooldown round-trips through editor', () => {
    const text = workoutToYaml('Т', all, {}, []);
    expect(text).not.toContain('exercise_id: Разминка');
    expect(workoutFromYaml(text, library, all, TODAY)).toMatchObject({ ok: true, blocks: all });
  });
  it('embedded warmup kept out of yaml and restored unchanged', () => {
    const rich: Block = { ...plainWarm, exercises: [{ id: 'b0-e0', name: 'Выпад', kind: 'time', pose: 'stand', target: { min: 30, max: 45 }, sides: ['вправо', 'влево'] }] };
    const text = workoutToYaml('Т', [rich, main], {}, library);
    expect(text).not.toContain('Выпад');
    const edited = text.replace('reps: 5', 'reps: 6');
    const r = workoutFromYaml(edited, library, [rich, main], TODAY);
    expect(r.ok && r.blocks[0]).toEqual(rich);
    expect(r.ok && exercisesOf(r.blocks[1]!)[0]!.target).toEqual({ min: 6, max: 6 });
    expect(r.ok && r.blocks.map((b) => b.id)).toEqual(['b0', 'b1']);
  });
  it('a warmup written by hand in the text wins over the kept one', () => {
    const text = `version: 1\nworkouts:\n  - title: Т\n    blocks:\n      - type: warmup\n        exercises:\n          - { name: Планка, time: 30s }\n      - type: sets\n        exercises:\n          - { name: Присед, do: 3x8 }\n`;
    const r = workoutFromYaml(text, library, [plainWarm, main], TODAY);
    expect(r.ok && r.blocks.filter((b) => b.mode === 'timed')).toHaveLength(1);
  });
  it('unedited yaml switches back without parsing', () => {
    const generated = workoutToYaml('Т', all, {}, []);
    const state = { title: 'Т', blocks: all, links: {}, notes: '' };
    // В библиотеке нет Приседа: разбор текста дал бы ошибку, а без правок его нет
    expect(workoutFromYaml(generated, [], all, TODAY)).toMatchObject({ ok: false });
    expect(readEditorYaml(generated, generated, state, [], TODAY)).toEqual({ ok: true, title: 'Т', blocks: all, links: {} });
    expect(readEditorYaml(`${generated} `, generated, state, [], TODAY)).toMatchObject({ ok: false });
  });
  it('sets block restSec kept on round trip', () => {
    const r = workoutFromYaml(workoutToYaml('Т', [main], {}, library), library, [main], TODAY);
    expect(r.ok && r.blocks[0]).toMatchObject({ mode: 'sets', restSec: 60 });
  });
});

describe('круг блоки → YAML → блоки', () => {
  it('ничего не теряет', () => {
    const back = workoutFromYaml(workoutToYaml('Ноги', blocks, {}, library), library, blocks, TODAY);
    expect(back).toEqual({ ok: true, title: 'Ноги', blocks, links: {} });
  });
  it('разминка и заминка из упражнений, дописанные текстом, читаются', () => {
    const text = `version: 1
workouts:
  - title: Ноги
    blocks:
      - type: warmup
        exercises:
          - name: Планка
            time: 30s
      - type: cooldown
        exercises:
          - name: Выпад
            time: 1m
            per_side: true
`;
    const r = workoutFromYaml(text, library, [], TODAY);
    expect(r.ok && r.blocks.map((b) => [b.mode, exercisesOf(b).length])).toEqual([['timed', 1], ['timed', 1]]);
  });
});

describe('правки', () => {
  const base = workoutToYaml('Ноги', blocks, {}, library);
  it('название блока и число подходов меняются', () => {
    const text = base.replace('title: Финишер', 'title: Конец').replace('sets: 4', 'sets: 5');
    const r = workoutFromYaml(text, library, blocks, TODAY);
    expect(r.ok && r.blocks[2]!.title).toBe('Конец');
    expect(r.ok && (exercisesOf(r.blocks[1]!)[0] as unknown as { sets: number }).sets).toBe(5);
  });
  it('прежние id остаются на своих местах, новые не совпадают с ними', () => {
    const previous: Block[] = [{ ...blocks[0]!, id: 'b3', exercises: exercisesOf(blocks[0]!).map((e, j) => ({ ...e, id: `b3-e${j}` })) } as Block];
    const r = workoutFromYaml(workoutToYaml('Ноги', blocks, {}, library), library, previous, TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.blocks.flatMap((b) => [b.id, ...exercisesOf(b).map((e) => e.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.blocks[0]!.id).toBe('b3');
  });
});

describe('ошибки', () => {
  const base = workoutToYaml('Ноги', blocks, {}, library);
  it('упражнения нет в библиотеке', () => {
    const r = workoutFromYaml(base.replace('exercise_id: Присед', 'exercise_id: Тяга'), library, blocks, TODAY);
    expect(r).toMatchObject({ ok: false, issues: [{ message: 'Неизвестный exercise_id: Тяга' }] });
  });
  it('две тренировки', () => {
    const r = workoutFromYaml(`${base}  - title: Ещё\n    blocks:\n      - type: warmup\n`, library, blocks, TODAY);
    expect(r.ok).toBe(false);
  });
  it('сломанный YAML даёт строку', () => {
    const r = workoutFromYaml('version: 1\nworkouts:\n\t- title: x', library, blocks, TODAY);
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.issues[0]!.line).toBeGreaterThan(0);
  });
  it('неверные video_rounds', () => {
    const r = workoutFromYaml(base.replace(/video_rounds:\n\s+- 3/, 'video_rounds: [9]'), library, blocks, TODAY);
    expect(r.ok).toBe(false);
  });
});

describe('разминка и заминка по ссылке', () => {
  const routines = [
    { id: 'obschaya-razminka', kind: 'warmup' as const, title: 'Общая разминка' },
    { id: 'obschaya-zaminka', kind: 'cooldown' as const, title: 'Общая заминка' },
  ];
  const main: Block[] = [{ id: 'm', mode: 'sets', title: 'Силовая', restSec: 90, videoRounds: [2], exercises: [{ id: 'm-e0', name: 'Присед', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 3, restSec: 60 }] }];
  const text = `version: 1
workouts:
  - title: Т
    blocks:
      - { type: warmup, routine: obschaya-razminka }
      - type: sets
        title: Силовая
        video_rounds: [2]
        exercises:
          - { name: Присед, do: 3x8 @ 60 }
      - { type: cooldown, routine: obschaya-zaminka }
`;

  it('пишет блоки routine: разминка первой, заминка последней', () => {
    const out = workoutToYaml('Т', main, { warmup: 'obschaya-razminka', cooldown: 'obschaya-zaminka' }, library);
    expect(out.indexOf('routine: obschaya-razminka')).toBeLessThan(out.indexOf('type: sets'));
    expect(out.indexOf('type: sets')).toBeLessThan(out.indexOf('routine: obschaya-zaminka'));
  });
  it('читает ссылки и не сдвигает video_rounds и названия блоков', () => {
    const r = workoutFromYaml(text, library, main, TODAY, routines);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.links).toEqual({ warmup: 'obschaya-razminka', cooldown: 'obschaya-zaminka' });
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]).toMatchObject({ id: 'm', title: 'Силовая', videoRounds: [2] });
  });
  it('круг: текст → ссылки → текст', () => {
    const links = { warmup: 'obschaya-razminka', cooldown: 'obschaya-zaminka' };
    const r = workoutFromYaml(workoutToYaml('Т', main, links, library), library, main, TODAY, routines);
    expect(r).toMatchObject({ ok: true, links, blocks: main });
  });
  it('без блоков routine ссылок нет', () => {
    const r = workoutFromYaml(workoutToYaml('Т', main, {}, library), library, main, TODAY, routines);
    expect(r).toMatchObject({ ok: true, links: {} });
  });
  it('набора нет в библиотеке: ошибка', () => {
    const r = workoutFromYaml(text, library, main, TODAY, []);
    expect(r.ok).toBe(false);
  });
  it('набор из routines самого файла не принимается: в библиотеку он отсюда не попадёт', () => {
    const own = `version: 1
routines:
  - id: neck
    title: Шея
    exercises:
      - { name: Вращения плечами, time: 30s }
workouts:
  - title: Т
    blocks:
      - { type: warmup, routine: neck }
      - type: sets
        exercises:
          - { name: Присед, do: 3x8 }
`;
    const r = workoutFromYaml(own, library, [], TODAY, routines);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]!.message).toContain('neck');
  });
  it('заминку нельзя поставить как разминку', () => {
    const r = workoutFromYaml(text.replace('routine: obschaya-razminka', 'routine: obschaya-zaminka'), library, main, TODAY, routines);
    expect(r.ok).toBe(false);
  });
});

describe('version: 2', () => {
  const full: Block[] = [
    { id: 'b0', mode: 'note', title: 'Тест пальца', text: 'Есть ли боль у основания' },
    {
      id: 'b1',
      mode: 'sets',
      title: 'Подтягивания',
      restSec: 90,
      videoRounds: [],
      exercises: [
        { id: 'b1-e0', name: 'Присед', kind: 'weight', target: { min: 4, max: 4 }, weight: 35, sets: 3, restSec: 180, note: 'Оба колена в петле' },
        { id: 'b1-e1', name: 'Планка', kind: 'time', target: { min: 0, max: 0 }, sets: 1, restSec: 180 },
        { id: 'b1-e2', name: 'Отжимания', kind: 'reps', target: { min: 0, max: 0 }, sets: 1, restSec: 90 },
      ],
    },
    { id: 'b2', mode: 'note', title: 'Вторая заметка', text: 'Запишите ощущения' },
    {
      id: 'b3',
      mode: 'circuit',
      title: 'Круг',
      rounds: 2,
      restSec: 90,
      restAfter: 'round',
      videoRounds: [],
      exercises: [
        { id: 'b3-e0', name: 'Выпад', kind: 'reps', target: { min: 10, max: 10 }, sides: ['левая нога', 'правая нога'], note: 'Колено над стопой' },
        { id: 'b3-e1', name: 'Жим лёжа', kind: 'weight', target: { min: 10, max: 12 }, weight: 8 },
      ],
    },
    { id: 'b4', mode: 'timed', title: 'Таймер', note: 'Без пауз', exercises: [{ id: 'b4-e0', name: 'Выпад', kind: 'time', target: { min: 45, max: 45 }, sides: ['вправо', 'влево'] }] },
  ];

  it('round trip v2 keeps notes, restSec, restAfter, sides, note block, time max', () => {
    const text = workoutToYaml('Ноги', full, {}, library, 'Рабочих подходов сегодня нет');
    expect(text).toContain('version: 2');
    expect(text).toContain('time_sec: max');
    const back = workoutFromYaml(text, library, full, TODAY);
    expect(back).toEqual({ ok: true, title: 'Ноги', blocks: full, links: {}, notes: 'Рабочих подходов сегодня нет' });
  });
  it('ids of blocks and exercises stay stable, note blocks included', () => {
    const previous = full.map((b, i) => ({ ...b, id: `x${i}`, ...(b.mode === 'note' ? {} : { exercises: b.exercises.map((e, j) => ({ ...e, id: `x${i}-e${j}` })) }) }) as Block);
    const back = workoutFromYaml(workoutToYaml('Ноги', full, {}, library), library, previous, TODAY);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.blocks.map((b) => b.id)).toEqual(['x0', 'x1', 'x2', 'x3', 'x4']);
    expect(back.blocks.map((b) => exercisesOf(b).map((e) => e.id))).toEqual([[], ['x1-e0', 'x1-e1', 'x1-e2'], [], ['x3-e0', 'x3-e1'], ['x4-e0']]);
  });
  it('notes are omitted when empty and absent on read', () => {
    const text = workoutToYaml('Ноги', full, {}, library);
    expect(text).not.toMatch(/^ {4}notes:/m);
    const back = workoutFromYaml(text, library, full, TODAY);
    expect(back.ok && back.notes).toBeUndefined();
  });
  it('exercise_id by library alias', () => {
    const aliased = [{ ...lib('Присед', 'weight'), id: 'squat', aliases: ['Приседания'] } as LibraryExercise, ...library.slice(1)];
    const one: Block[] = [{ id: 'b0', mode: 'sets', title: 'Т', restSec: 90, videoRounds: [], exercises: [{ id: 'b0-e0', name: 'приседания', kind: 'reps', target: { min: 5, max: 5 }, sets: 1, restSec: 90 }] }];
    expect(workoutToYaml('Т', one, {}, aliased)).toContain('exercise_id: squat');
  });
  it('unknown name written as exercise_id gives unknown exercise_id', () => {
    const one: Block[] = [{ id: 'b0', mode: 'sets', title: 'Т', restSec: 90, videoRounds: [], exercises: [{ id: 'b0-e0', name: 'Неведомое', kind: 'reps', target: { min: 5, max: 5 }, sets: 1 }] }];
    const text = workoutToYaml('Т', one, {}, library);
    expect(text).toContain('exercise_id: Неведомое');
    expect(workoutFromYaml(text, library, one, TODAY)).toMatchObject({ ok: false, issues: [{ message: 'Неизвестный exercise_id: Неведомое' }] });
  });
  it('legacy circuit warning text', () => {
    const old: Block[] = [{ id: 'b0', mode: 'circuit', title: 'Круг', rounds: 2, restSec: 30, videoRounds: [], exercises: [] }];
    expect(legacyCircuitWarnings(old)).toEqual(['Отдых в круге «Круг» после сохранения будет после круга, а не после каждого упражнения']);
    expect(legacyCircuitWarnings(full)).toEqual([]);
    expect(workoutToYaml('Т', old, {}, library)).toContain('rest_sec: 30');
  });
  it('reads v1 as before', () => {
    const r = workoutFromYaml('version: 1\nworkouts:\n  - title: Т\n    blocks:\n      - type: sets\n        exercises:\n          - { name: Присед, do: 3x8 @ 60 }\n', library, [], TODAY);
    expect(r.ok && exercisesOf(r.blocks[0]!)[0]).toMatchObject({ name: 'Присед', weight: 60 });
  });
});
