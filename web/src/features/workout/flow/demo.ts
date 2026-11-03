/**
 * Ролик чибика вместо статичного: только пока идёт упражнение и только на шаге без записи
 * (на шаге записи чибик держит камеру, на отдыхе отдыхает).
 */
export function demoFor({ phase, record, demoUrl }: { phase: 'work' | 'rest'; record: boolean; demoUrl?: string }): string | undefined {
  return phase === 'work' && !record ? demoUrl : undefined;
}
