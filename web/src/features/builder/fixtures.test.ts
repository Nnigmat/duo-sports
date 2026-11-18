import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AgentWorkout, DraftRequest, DraftResponse } from '../../../../shared/aiDraft';
import type { LibraryEntry } from '../../../../shared/types';
import { buildWorkout } from './build';
import { ctx } from './testkit';
import { item, lost, MAIN_ITEMS, unmatched } from './fixtureMatch';
import type { BuilderDraft } from './types';

describe('сопоставление пунктов запроса', () => {
  const ex = (name: string) => ({ id: name, name, kind: 'reps' as const, target: { min: 5, max: 5 }, sets: 1 });
  const names = [
    'Лицевая тяга',
    'Y-T-W лёжа на животе',
    'Отжимания на упорах',
    'Вис',
    'Подтягивания',
    'Подтягивания с резинкой',
    'Подъём коленей в висе',
    'Медленное опускание',
    'Сгибание руки с гантелью',
    'Мёртвая тяга с гантелей',
    'Подъём ног на столе',
  ];
  const draft = (main: string[]): BuilderDraft =>
    ({
      date: '2026-11-18',
      title: '',
      blocks: [
        { id: 'b0', mode: 'sets', exercises: main.map(ex) },
        { id: 'b1', mode: 'note', title: 'Тест большого пальца', text: '' },
      ],
      newExercises: [],
      warmup: {
        kind: 'new',
        title: 'Моя',
        items: ['Мобилизация запястья', 'Открытая книга', 'Поза 90/90', 'Глубокий присед', 'Подъём колена с резинкой'].map((name) => ({ name, sec: 30 })),
      },
      cooldown: { kind: 'new', title: 'Моя', items: ['Растяжка верхней трапеции', 'Разгибание грудного отдела на ролле'].map((name) => ({ name, sec: 30 })) },
      advice: [],
      marks: {},
      unparsed: [],
    }) as unknown as BuilderDraft;

  it('проходит, когда все пункты есть', () => {
    expect(lost(draft(names))).toEqual([]);
  });

  it('падает без виса', () => {
    expect(lost(draft(names.filter((n) => n !== 'Вис')))).toEqual(['основная: вис']);
  });

  it('«в висе» не считается за вис', () => {
    expect(unmatched([MAIN_ITEMS[3]!], ['Подъём коленей в висе'])).toEqual(['вис']);
  });

  it('одно упражнение закрывает один пункт', () => {
    const pull = [MAIN_ITEMS[4]!, MAIN_ITEMS[5]!];
    expect(unmatched(pull, ['Подтягивания с резинкой'])).toEqual(['чистые подтягивания']);
    expect(unmatched(pull, ['Подтягивания с резинкой', 'Подтягивания'])).toEqual([]);
    // широкий шаблон не отнимает упражнение у узкого
    expect(unmatched([item('широкий', /подтяг/), item('узкий', /подтяг.*резин/)], ['Подтягивания', 'Подтягивания с резинкой'])).toEqual([]);
  });

  it('ё = е и регистр не важны', () => {
    expect(unmatched([item('м', /м[её]ртв/)], ['МЁРТВАЯ тяга'])).toEqual([]);
  });

  it('пункт разминки находится в тексте advice', () => {
    const d = draft(names);
    d.warmup = { kind: 'none' };
    d.advice = ['Мобилизация запястья', 'Открытая книга', 'Поза 90/90', 'Глубокий присед', 'Подъём колена с резинкой'].map((t, i) => ({ id: `a${i}`, text: `${t} переведена в общую разминку` }));
    expect(lost(d)).toEqual([]);
  });
});

const WARMUP_TEXT = `Хочу сделать новую разминку, которая дополнит упражнения из общей разминки следующими упражнениями:

Мобилизация запястья с движением 10
Открытая книга 5 на сторону
Поза 90/90 по 30 с
Удержание глубокого приседа 30 с
Подъём колена стоя с резинкой с удержанием 5 × 3 с на ногу`;
const COOLDOWN_TEXT =
  'Хочу сделать новую заминку, которая дополнит упражнения из общей разминки следующими упражнениями:\n\nРастяжку верхней трапеции и мышцы, поднимающей лопатку, и Разгибание грудного отдела на МФР-ролле';
const MAIN_TEXT = 'Плечи: Лицевая тяга 12 раз, Y-T-W лёжа на животе. ПЕРЕПРОВЕРКА СТАРТА: отжимания, вис, подтягивания, подъём коленей в висе.';

const usage = { input: 1, cacheCreation: 0, cacheRead: 0, output: 1 };
/** Запрос, как при сборке фикстуры: «Описать свою» для разминки и заминки */
const req: DraftRequest = {
  athleteId: null,
  date: '2026-11-18',
  title: '',
  warmup: { text: WARMUP_TEXT },
  main: { text: MAIN_TEXT, exercises: [] },
  cooldown: { text: COOLDOWN_TEXT },
};

/** Один ответ агента через buildWorkout: ok, пометки, «Не разобрал» и потерянные пункты */
async function runFixture(workout: AgentWorkout, library: LibraryEntry[]) {
  const send = async (): Promise<DraftResponse> => ({ workout, usage });
  const r = await buildWorkout(req, { ...ctx, library }, [], send);
  if (!r.ok) return { ok: false as const, errors: r.errors };
  return { ok: true as const, marks: r.draft.marks, unparsed: r.draft.unparsed, lost: lost(r.draft) };
}

describe('прогон ответа агента', () => {
  const lib = (id: string, name: string, kind: LibraryEntry['kind']): LibraryEntry => ({ id, name, aliases: [], kind, group: 'arms', muscles: [], equipment: [] });
  const library: LibraryEntry[] = [
    lib('face-pull', 'Лицевая тяга', 'reps'),
    lib('ytw', 'Y-T-W лёжа на животе', 'reps'),
    lib('pushup', 'Отжимания на упорах', 'reps'),
    lib('dead-hang', 'Вис на перекладине', 'time'),
    lib('pullup', 'Подтягивания', 'reps'),
    lib('pullup-band', 'Подтягивания с резинкой', 'weight'),
    lib('knee-raise', 'Подъём коленей в висе', 'reps'),
    lib('slow-lower', 'Медленное опускание после запрыгивания', 'reps'),
    lib('curl', 'Сгибание руки с гантелью', 'weight'),
    lib('rdl', 'Мёртвая тяга с гантелей', 'weight'),
    lib('leg-raise', 'Подъём ног на столе', 'reps'),
    lib('wrist', 'Мобилизация запястья', 'time'),
    lib('book', 'Открытая книга', 'time'),
    lib('9090', 'Поза 90/90', 'time'),
    lib('squat-hold', 'Удержание глубокого приседа', 'time'),
    lib('knee-band', 'Подъём колена стоя с резинкой', 'time'),
    lib('trap', 'Растяжка верхней трапеции', 'time'),
    lib('thoracic', 'Разгибание грудного отдела на ролле', 'time'),
  ];
  const sets = (...ids: string[]) => ({ type: 'sets' as const, exercises: ids.map((exercise_id) => ({ exercise_id, sets: 3, reps: '8' })) });
  const items = (...ids: string[]) => ids.map((exercise_id) => ({ exercise_id, time_sec: 30 }));
  const full = (): AgentWorkout => ({
    title: 'Фикстура',
    warmup: { new_routine: { id: 'my-warmup', title: 'Моя разминка', exercises: items('wrist', 'book', '9090', 'squat-hold', 'knee-band') } },
    cooldown: { new_routine: { id: 'my-cooldown', title: 'Моя заминка', exercises: items('trap', 'thoracic') } },
    blocks: [
      sets('face-pull', 'ytw', 'pushup'),
      { type: 'timed', exercises: [{ exercise_id: 'dead-hang', time_sec: 30 }] },
      sets('pullup', 'pullup-band', 'knee-raise', 'slow-lower'),
      { type: 'note', title: 'Тест большого пальца', text: 'Большой палец в кулак, кисть наклонить к мизинцу.', exercises: [] },
      sets('curl', 'rdl', 'leg-raise'),
    ],
    new_exercises: [],
    advice: [],
  });

  it('полный ответ проходит без потерь', async () => {
    const r = await runFixture(full(), library);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.marks).toEqual({});
    expect(r.unparsed).toEqual([]);
    expect(r.lost).toEqual([]);
  });

  it('без виса сообщает о потере', async () => {
    const w = full();
    w.blocks = w.blocks.filter((b) => !b.exercises.some((e) => e.exercise_id === 'dead-hang'));
    const r = await runFixture(w, library);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.lost).toEqual(['основная: вис']);
  });

  it('без своей разминки сообщает о потере', async () => {
    const r = await runFixture({ ...full(), warmup: null }, library);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.lost.filter((l) => l.startsWith('разминка'))).toHaveLength(5);
  });
});

const dir = new URL('./__fixtures__/', import.meta.url);
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'library.json') : [];
const libraryFile = new URL('library.json', dir);

describe('сохранённые ответы агента', () => {
  if (files.length === 0) {
    it.skip('Нет сохранённых ответов агента', () => {});
    return;
  }
  for (const f of files) {
    it(f, async () => {
      if (!existsSync(libraryFile)) throw new Error('Рядом с ответами нет library.json: см. __fixtures__/README.md');
      const library: LibraryEntry[] = JSON.parse(readFileSync(libraryFile, 'utf8'));
      const workout: AgentWorkout = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      const r = await runFixture(workout, library);
      if (!r.ok) throw new Error(JSON.stringify(r.errors));
      expect(r.marks).toEqual({});
      expect(r.unparsed).toEqual([]);
      expect(r.lost).toEqual([]);
    });
  }
});
