import type { Block, Routine, TimedBlock } from './types';

/** Блок тренировки из разминки или заминки; id упражнений стабильны: r<dbId>-e<i> */
export function routineBlock(r: Routine, dbId: number): TimedBlock {
  const pose = r.kind === 'warmup' ? 'stand' : 'stretch';
  return {
    id: `r${dbId}`,
    mode: 'timed',
    kind: r.kind,
    title: r.title,
    ...(r.note ? { note: r.note } : {}),
    exercises: r.items.map((it, i) => ({
      id: `r${dbId}-e${i}`,
      name: it.name,
      kind: 'time' as const,
      pose,
      target: it.sec,
      ...(it.sides ? { sides: it.sides } : {}),
    })),
  };
}

/** Разминка первой, заминка последней; пустые блоки пропускаются */
export function composeBlocks(
  main: Block[],
  warmup: TimedBlock | null,
  cooldown: TimedBlock | null,
): Block[] {
  const out: Block[] = [];
  if (warmup && warmup.exercises.length > 0) out.push(warmup);
  out.push(...main);
  if (cooldown && cooldown.exercises.length > 0) out.push(cooldown);
  return out;
}

const COPY_SUFFIX = /\s+копия \(\d+\)$/i;

/** Название копии: «Имя копия (n)», n — наименьший свободный среди taken (без учёта регистра).
 * Копия копии нумеруется от исходного имени. Основа укорачивается, чтобы влезть в limit. */
export function copyTitle(title: string, taken: string[], limit = 80): string {
  const base = title.replace(COPY_SUFFIX, '').trim() || title.trim();
  const used = new Set(taken.map((t) => t.toLowerCase()));
  for (let n = 1; ; n++) {
    const suffix = ` копия (${n})`;
    const candidate = `${base.slice(0, limit - suffix.length).trimEnd()}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
