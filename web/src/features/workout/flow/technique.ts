import type { Technique } from '../../../../../shared/types';

/** Есть ли что показать в панели «Техника»: шаги или видео */
export function hasTechnique(t: Technique): boolean {
  return t.instructions.length > 0 || Boolean(t.videoUrl);
}
