import type { Block } from '../../../../../shared/types';

/** Нужна ли запись на подходе: круг (или номер подхода) помечен для видео. */
export function needsRecording(block: Block, round: number): boolean {
  return block.mode !== 'timed' && block.videoRounds.includes(round);
}
