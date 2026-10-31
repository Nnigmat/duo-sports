import type { Pose } from '../../../../../shared/types';

export const POSES: Pose[] = [
  'stand', 'headroll', 'shoulders', 'dips', 'scissors', 'lunge',
  'squat', 'plank', 'rest', 'camera', 'stretch', 'cheer', 'wave',
];

export type Phase = 'start' | 'work' | 'rest' | 'finish';

/** Какую позу показать: служебная фаза важнее упражнения, запись важнее позы упражнения. */
export function poseFor(a: { phase: Phase; exercisePose?: Pose; record?: boolean }): Pose {
  switch (a.phase) {
    case 'rest':
      return 'rest';
    case 'finish':
      return 'cheer';
    case 'start':
      return 'stand';
    case 'work':
      return a.record ? 'camera' : (a.exercisePose ?? 'stand');
  }
}
