// Только для историй: данные из макета «Старт тренировки»
import type { Block, Exercise } from '../../../../../shared/types';

const secs = (id: string, name: string, pose: Exercise['pose']): Exercise => ({
  id,
  name,
  pose,
  kind: 'time',
  target: { min: 30, max: 30 },
});

export const WARMUP: Block = {
  id: 'warmup',
  mode: 'timed',
  title: 'Разминка',
  note: 'Повторяйте за персонажем: вращения головой, плечами и другие',
  exercises: ['Вращения головой', 'Вращения плечами', 'Круги руками', 'Наклоны', 'Выпады на месте', 'Прыжки'].map((n, i) =>
    secs(`w${i}`, n, i === 0 ? 'headroll' : i === 1 ? 'shoulders' : 'stand'),
  ),
};

export const CIRCUIT: Block = {
  id: 'circuit',
  mode: 'circuit',
  title: 'По кругу',
  rounds: 3,
  restSec: 60,
  videoRounds: [2],
  exercises: [
    { id: 'dips', name: 'Обратные отжимания от лавочки', kind: 'reps', pose: 'dips', target: { min: 18, max: 20 } },
    { id: 'scissors', name: 'Ножницы лёжа', kind: 'reps', pose: 'scissors', target: { min: 30, max: 34 } },
    { id: 'lunge', name: 'Выпады', kind: 'reps', pose: 'lunge', target: { min: 14, max: 16 } },
  ],
};

export const COOLDOWN: Block = {
  id: 'cooldown',
  mode: 'timed',
  title: 'Заминка',
  note: 'Растяжка',
  exercises: ['Наклон в сторону', 'Бёдра', 'Плечи', 'Спина'].map((n, i) => secs(`c${i}`, n, 'stretch')),
};

export const STRENGTH: Block = {
  id: 'strength',
  mode: 'sets',
  title: 'Силовая',
  restSec: 90,
  videoRounds: [2, 3],
  exercises: [
    { id: 'squat', name: 'Приседания с гантелью', kind: 'weight', pose: 'squat', target: { min: 12, max: 12 }, weight: 12, sets: 3 },
    { id: 'plank', name: 'Планка', kind: 'time', pose: 'plank', target: { min: 45, max: 60 }, sets: 2 },
  ],
};
