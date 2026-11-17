import { DRAFT_TEXT_MAX, type DraftRequest, type RoutineAsk } from '../../../../shared/aiDraft';
import type { Block, ExerciseKind } from '../../../../shared/types';

/** Разминка или заминка на шаге ввода: готовая из библиотеки, описанная словами или никакой */
export type RoutineChoice = { kind: 'library'; slug: string } | { kind: 'text'; text: string } | { kind: 'none' };

export interface BuilderInput {
  title: string;
  warmup: RoutineChoice;
  main: { text: string; /** slug выбранных из библиотеки */ picked: string[] };
  cooldown: RoutineChoice;
}

/** Новое упражнение черновика: поля заполнил агент, тренер правит; similar — имя похожего из библиотеки */
export interface NewExerciseDraft {
  name: string;
  slug: string;
  muscles: string[];
  kind: ExerciseKind;
  equipment: string[];
  notes: string;
  aliases: string[];
  similar?: string;
}

export interface NewRoutineItem {
  name: string;
  /** Секунды на одну сторону */
  sec: number;
  sides?: [string, string];
}

export type RoutinePick = { kind: 'none' } | { kind: 'library'; slug: string } | { kind: 'new'; title: string; items: NewRoutineItem[] };

/** Заметка агента над формой; suggest — имя упражнения библиотеки для «Заменить» */
export interface Advice {
  id: string;
  text: string;
  exercise?: string;
  suggest?: string;
}

/** Черновик формы: всё, что сохранит одно «Сохранить» */
export interface BuilderDraft {
  date: string;
  title: string;
  blocks: Block[];
  newExercises: NewExerciseDraft[];
  warmup: RoutinePick;
  cooldown: RoutinePick;
  advice: Advice[];
}

export const EMPTY_INPUT: BuilderInput = { title: '', warmup: { kind: 'none' }, main: { text: '', picked: [] }, cooldown: { kind: 'none' } };

const fits = (s: string) => s.length <= DRAFT_TEXT_MAX;
const choiceOk = (c: RoutineChoice) => c.kind !== 'text' || (c.text.trim() !== '' && fits(c.text));

/** Можно собирать: есть основная часть (текст или выбранные упражнения), тексты в пределах, «Описать свою» не пустая */
export function canBuild(input: BuilderInput): boolean {
  const hasMain = input.main.text.trim() !== '' || input.main.picked.length > 0;
  return hasMain && fits(input.main.text) && fits(input.title) && choiceOk(input.warmup) && choiceOk(input.cooldown);
}

const ask = (c: RoutineChoice): RoutineAsk => (c.kind === 'library' ? { routine: c.slug } : c.kind === 'text' ? { text: c.text.trim() } : null);

export function toRequest(input: BuilderInput, date: string, athleteId: number | null): DraftRequest {
  return {
    athleteId,
    date,
    title: input.title.trim(),
    warmup: ask(input.warmup),
    main: { text: input.main.text.trim(), exercises: input.main.picked },
    cooldown: ask(input.cooldown),
  };
}
