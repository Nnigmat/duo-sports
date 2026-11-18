import type { Block, Exercise } from './types';

/** Упражнения блока; у блока-заметки их нет */
export const exercisesOf = (b: Block): Exercise[] => (b.mode === 'note' ? [] : b.exercises);
