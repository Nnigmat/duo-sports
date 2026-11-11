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
