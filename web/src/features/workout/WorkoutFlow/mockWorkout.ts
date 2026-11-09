// Только для историй и тестов: короткая тренировка на моковых данных, чтобы пройти весь поток за пару минут.
import type { Technique, Workout } from '../../../../../shared/types';
import type { SwapOption } from '../flow';
import { COMMENTS, TECHNIQUE } from '../sheets/storyData';

export { COMMENTS };

export const WORKOUT: Workout = {
  id: 'demo',
  title: 'Круговая тренировка',
  blocks: [
    {
      id: 'warmup',
      mode: 'timed',
      title: 'Разминка',
      note: 'Повторяйте за персонажем: вращения головой, плечами и другие',
      exercises: [
        { id: 'w1', name: 'Вращения головой', kind: 'time', pose: 'headroll', target: { min: 5, max: 5 } },
        { id: 'w2', name: 'Вращения плечами', kind: 'time', pose: 'shoulders', target: { min: 5, max: 5 } },
        { id: 'w3', name: 'Стойка на месте', kind: 'time', pose: 'stand', target: { min: 5, max: 5 } },
      ],
    },
    {
      id: 'circuit',
      mode: 'circuit',
      title: 'По кругу',
      rounds: 3,
      restSec: 5,
      videoRounds: [2],
      exercises: [
        { id: 'dips', name: 'Обратные отжимания', kind: 'reps', pose: 'dips', target: { min: 18, max: 20 } },
        { id: 'scissors', name: 'Ножницы лёжа', kind: 'reps', pose: 'scissors', target: { min: 30, max: 34 } },
        { id: 'lunge', name: 'Выпады', kind: 'reps', pose: 'lunge', target: { min: 14, max: 16 } },
      ],
    },
    {
      id: 'strength',
      mode: 'sets',
      title: 'Силовая',
      restSec: 5,
      videoRounds: [],
      exercises: [
        { id: 'squat', name: 'Приседания с гантелью', kind: 'weight', pose: 'squat', target: { min: 12, max: 12 }, weight: 12, sets: 2 },
        { id: 'plank', name: 'Планка', kind: 'time', pose: 'plank', target: { min: 8, max: 8 }, sets: 1 },
      ],
    },
    {
      id: 'cooldown',
      mode: 'timed',
      title: 'Заминка',
      note: 'Растяжка',
      exercises: [
        { id: 'c1', name: 'Наклон в сторону', kind: 'time', pose: 'stretch', target: { min: 5, max: 5 } },
        { id: 'c2', name: 'Наклон в другую сторону', kind: 'time', pose: 'stretch', target: { min: 5, max: 5 } },
      ],
    },
  ],
};

export const TECHNIQUES: Record<string, Technique> = {
  dips: TECHNIQUE,
  scissors: {
    instructions: ['Лягте на спину, поясницу прижмите к полу.', 'Поднимите прямые ноги и скрещивайте их.'],
    mistake: 'поясница отрывается от пола.',
  },
  lunge: {
    instructions: ['Шагните вперёд и опуститесь до прямого угла в коленях.', 'Вернитесь в стойку и смените ногу.'],
    mistake: 'колено уходит внутрь.',
  },
};

/** Библиотека для «Заменить»: упражнения на трицепс и ещё пара из других групп */
const DEFAULTS = { reps: 10, weight: 20, seconds: 30 };
export const LIBRARY: SwapOption[] = [
  { id: 'dips', name: 'Обратные отжимания', kind: 'reps', group: 'arms', muscles: ['трицепс', 'грудь'], defaults: DEFAULTS },
  { id: 'french-press', name: 'Французский жим', kind: 'weight', group: 'arms', muscles: ['трицепс'], defaults: DEFAULTS },
  { id: 'push-up', name: 'Отжимания', kind: 'reps', group: 'chest', muscles: ['грудь', 'трицепс'], defaults: DEFAULTS },
  { id: 'biceps-curl', name: 'Сгибания на бицепс', kind: 'weight', group: 'arms', muscles: ['бицепс'], defaults: DEFAULTS },
  { id: 'plank', name: 'Планка', kind: 'time', group: 'core', muscles: ['пресс', 'кор'], defaults: DEFAULTS },
];
