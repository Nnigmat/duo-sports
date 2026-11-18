import type { BuilderDraft } from './types';
import { library as entries } from './testkit';
import { toLibraryExercise } from '../exercises/api';

/** Данные для историй экранов сборки */
export const libraryEntries = entries;
export const libraryExercises = entries.map(toLibraryExercise);
export const routines = [
  { id: 'neck-shoulders', kind: 'warmup' as const, title: 'Шея и плечи' },
  { id: 'joints', kind: 'warmup' as const, title: 'Суставная' },
  { id: 'back-stretch', kind: 'cooldown' as const, title: 'Растяжка спины' },
];

export const reviewDraft: BuilderDraft = {
  date: '2026-11-18',
  title: 'Грудь и трицепс',
  blocks: [
    {
      id: 'b1',
      mode: 'sets',
      title: 'Подходами',
      restSec: 90,
      videoRounds: [],
      exercises: [
        { id: 'x1', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 4 },
        { id: 'x2', name: 'Отжимания с хлопком', kind: 'reps', target: { min: 10, max: 10 }, sets: 3 },
      ],
    },
  ],
  newExercises: [{ name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['грудь', 'трицепс'], kind: 'reps', equipment: ['Коврик'], notes: 'Корпус прямой, толчок резкий', aliases: [], similar: 'Отжимания на брусьях' }],
  warmup: { kind: 'library', slug: 'neck-shoulders' },
  cooldown: { kind: 'none' },
  advice: [{ id: 'a0', text: 'В библиотеке есть похожее — Отжимания на брусьях', exercise: 'Отжимания с хлопком', suggest: 'Отжимания на брусьях' }],
  marks: {},
  unparsed: [],
};
