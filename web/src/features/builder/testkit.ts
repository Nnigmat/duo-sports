import type { AgentWorkout } from '../../../../shared/aiDraft';
import type { LibraryEntry } from '../../../../shared/types';
import type { ParseContext } from '../import/parse';

/** Небольшая библиотека и разминка для тестов сборки */
export const library: LibraryEntry[] = [
  { id: 'bench-press', name: 'Жим лёжа', aliases: ['жим штанги лёжа'], kind: 'weight', group: 'chest', muscles: ['грудь'], equipment: ['Штанга'] },
  { id: 'dips', name: 'Отжимания на брусьях', aliases: ['брусья'], kind: 'reps', group: 'arms', muscles: ['трицепс'], equipment: [] },
  { id: 'arm-circles', name: 'Вращение руками', aliases: [], kind: 'time', group: 'arms', muscles: ['плечи'], equipment: [] },
];

export const ctx: ParseContext = {
  library,
  routines: [
    { id: 'neck-shoulders', kind: 'warmup', title: 'Шея и плечи' },
    { id: 'back-stretch', kind: 'cooldown', title: 'Растяжка спины' },
  ],
  today: '2026-11-17',
  mine: {},
};

export const agent = (over: Partial<AgentWorkout> = {}): AgentWorkout => ({
  title: 'Верх тела',
  warmup: { routine: 'neck-shoulders' },
  cooldown: null,
  blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', do: '4x8 @ 60' }] }],
  new_exercises: [],
  advice: [],
  ...over,
});
