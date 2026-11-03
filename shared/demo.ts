import type { ExerciseDemo, Gender } from './types';

/** Ролик под пол спортсмена, иначе любой имеющийся, иначе ничего. Без пола первым идёт женский. */
export function pickDemo(gender: Gender | undefined, demo: ExerciseDemo | undefined): string | undefined {
  if (!demo) return undefined;
  const own = gender === 'male' ? demo.male : demo.female;
  return own ?? demo.female ?? demo.male;
}
