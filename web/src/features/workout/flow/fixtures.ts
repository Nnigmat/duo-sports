import type { CircuitBlock, SetsBlock, TimedBlock } from '../../../../../shared/types';

export const warmup: TimedBlock = {
  id: 'warmup',
  mode: 'timed',
  title: 'Разминка',
  exercises: [
    { id: 'head', name: 'Вращения головой', kind: 'time', target: { min: 30, max: 30 } },
    { id: 'shoulders', name: 'Вращения плечами', kind: 'time', target: { min: 30, max: 30 } },
  ],
};

export const circuit: CircuitBlock = {
  id: 'circuit',
  mode: 'circuit',
  title: 'По кругу',
  rounds: 3,
  restSec: 60,
  videoRounds: [2],
  exercises: [
    { id: 'dips', name: 'Обратные отжимания', kind: 'reps', pose: 'dips', target: { min: 18, max: 20 } },
    { id: 'scissors', name: 'Ножницы лёжа', kind: 'reps', target: { min: 30, max: 34 } },
    { id: 'lunge', name: 'Выпады', kind: 'reps', target: { min: 14, max: 16 } },
  ],
};

export const setsBlock: SetsBlock = {
  id: 'sets',
  mode: 'sets',
  title: 'Силовая',
  restSec: 90,
  videoRounds: [3],
  exercises: [
    { id: 'squat', name: 'Приседания', kind: 'weight', target: { min: 12, max: 12 }, weight: 12, sets: 3 },
    { id: 'plank', name: 'Планка', kind: 'time', target: { min: 45, max: 60 }, sets: 2 },
  ],
};
