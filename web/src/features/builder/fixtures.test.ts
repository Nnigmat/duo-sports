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

const dir = new URL('./__fixtures__/', import.meta.url);
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'library.json') : [];
const libraryFile = new URL('library.json', dir);
const usage = { input: 1, cacheCreation: 0, cacheRead: 0, output: 1 };
const req: DraftRequest = { athleteId: null, date: '2026-11-18', title: '', warmup: null, main: { text: 'фикстура', exercises: [] }, cooldown: null };

describe('сохранённые ответы агента', () => {
  if (files.length === 0) {
    it.skip('Нет сохранённых ответов агента', () => {});
    return;
  }
  const library: LibraryEntry[] = JSON.parse(readFileSync(libraryFile, 'utf8'));
  for (const f of files) {
    it(f, async () => {
      const workout: AgentWorkout = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      const send = async (): Promise<DraftResponse> => ({ workout, usage });
      const r = await buildWorkout(req, { ...ctx, library }, [], send);
      if (!r.ok) throw new Error(JSON.stringify(r.errors));
      expect(r.draft.marks).toEqual({});
      expect(r.draft.unparsed).toEqual([]);
      expect(lost(r.draft)).toEqual([]);
    });
  }
});
