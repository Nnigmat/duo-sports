import type { Pose } from '../../../../../shared/types';
import type { Part } from './parts';

export type HeadMotion = 'bob' | 'tilt';

export interface PoseConfig {
  parts: Part[];
  /** положение головы в координатах 300 × 300 */
  head: string;
  motion: HeadMotion;
  alt: string;
}

export const POSE_CONFIG: Record<Pose, PoseConfig> = {
  stand: { parts: ['base', 'armsDown'], head: 'translate(150 90)', motion: 'bob', alt: 'Персонаж стоит' },
  headroll: { parts: ['base', 'armsHips', 'arcHead'], head: 'translate(146 92)', motion: 'tilt', alt: 'Персонаж вращает головой' },
  shoulders: { parts: ['base', 'armsShoulders', 'arcShoulders'], head: 'translate(150 90)', motion: 'bob', alt: 'Персонаж вращает плечами' },
  camera: { parts: ['base', 'armsCamera'], head: 'translate(150 88)', motion: 'bob', alt: 'Персонаж держит камеру: пора включить запись' },
  wave: { parts: ['base', 'armsWave'], head: 'translate(150 90)', motion: 'bob', alt: 'Персонаж машет рукой' },
  cheer: { parts: ['base', 'armsCheer', 'confetti'], head: 'translate(150 90)', motion: 'bob', alt: 'Персонаж показывает большой палец, вокруг фантики' },
  dips: { parts: ['dips'], head: 'translate(140 128)', motion: 'bob', alt: 'Персонаж делает обратные отжимания от лавочки, светится трицепс' },
  scissors: { parts: ['scissors'], head: 'translate(84 204) rotate(-24) scale(0.92)', motion: 'bob', alt: 'Персонаж лёжа делает ножницы, светится пресс' },
  lunge: { parts: ['lunge'], head: 'translate(150 98)', motion: 'bob', alt: 'Персонаж делает выпад, светятся бёдра' },
  squat: { parts: ['squat'], head: 'translate(150 106)', motion: 'bob', alt: 'Персонаж приседает с гантелью, светятся бёдра' },
  plank: { parts: ['plank'], head: 'translate(72 198) rotate(8) scale(0.92)', motion: 'bob', alt: 'Персонаж стоит в планке, светится пресс' },
  rest: { parts: ['rest'], head: 'translate(150 132) rotate(-8)', motion: 'bob', alt: 'Персонаж сидит и пьёт воду' },
  stretch: { parts: ['stretch'], head: 'translate(138 100) rotate(-14)', motion: 'bob', alt: 'Персонаж тянется в сторону' },
};
