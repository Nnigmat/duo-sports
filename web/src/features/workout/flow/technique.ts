import type { Technique } from '../../../../../shared/types';

/** Есть ли что показать в панели «Техника»: шаги (ролик чибика играет на экране тренировки, не в панели) */
export function hasTechnique(t: Technique): boolean {
  return t.instructions.length > 0;
}
