import type { DraftRequest } from '../shared/aiDraft';
import type { ExerciseKind, RoutineKind } from '../shared/types';
import { AGENT_FORMAT, AGENT_INSTRUCTIONS } from './aiInstructions';
import type { Db } from './db';
import { libraryOf } from './imports';

export interface PromptRoutine {
  id: string;
  kind: RoutineKind;
  title: string;
  items: Array<{ exercise: string; sec: number; sides: [string, string] | null }>;
}
export interface PromptExercise {
  id: string;
  name: string;
  aliases: string[];
  kind: ExerciseKind;
  muscles: string[];
  equipment: string[];
}
export type SystemBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };
export interface Prompt {
  system: SystemBlock[];
  user: string;
}

/** Сортировка по коду символов, без учёта локали: один и тот же текст на любой машине */
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Только поля PromptExercise: лишнее в библиотеке сбило бы кеш */
const toPromptExercise = ({ id, name, aliases, kind, muscles, equipment }: PromptExercise): PromptExercise => ({ id, name, aliases, kind, muscles, equipment });

/** Библиотека для агента: только то, по чему он выбирает упражнение. Без demo, notes и group — они меняются сами и сбили бы кеш. */
export function promptLibrary(db: Db): PromptExercise[] {
  return libraryOf(db).map(toPromptExercise).sort(byId);
}

type RoutineItemRow = { slug: string; kind: RoutineKind; title: string; exercise: string; max_sec: number; sides: string | null };

/** Разминки и заминки с упражнениями по порядку; время — верхняя граница, на одну сторону. */
export function promptRoutines(db: Db): PromptRoutine[] {
  const rows = db
    .prepare(
      `SELECT r.slug, r.kind, r.title, e.slug AS exercise, i.max_sec, i.sides
       FROM routines r JOIN routine_items i ON i.routine_id = r.id JOIN exercises e ON e.id = i.exercise_id
       ORDER BY r.slug, i.position`,
    )
    .all() as RoutineItemRow[];
  const out = new Map<string, PromptRoutine>();
  for (const r of rows) {
    const routine = out.get(r.slug) ?? { id: r.slug, kind: r.kind, title: r.title, items: [] };
    routine.items.push({ exercise: r.exercise, sec: r.max_sec, sides: r.sides ? (JSON.parse(r.sides) as [string, string]) : null });
    out.set(r.slug, routine);
  }
  return [...out.values()];
}

const cache = { type: 'ephemeral' } as const;

/** Строка запроса агенту про разминку или заминку */
const routineLine = (label: string, ask: DraftRequest['warmup']) => {
  if (!ask) return `${label}: null — без неё`;
  if ('routine' in ask) return `${label}: набор из библиотеки, id ${ask.routine}`;
  return `${label}: собрать новый набор по описанию:\n${ask.text}`;
};

/**
 * Запрос агенту от самого стабильного к самому изменчивому: кеш совпадает только по началу.
 * 1 инструкции, 2 формат, 3 правила ← точка кеша, 4 разминки, 5 библиотека ← точка кеша; ввод тренера — в сообщении.
 * Точек две из четырёх допустимых, TTL — стандартные 5 минут:
 * https://platform.claude.com/docs/en/build-with-claude/prompt-caching
 */
export function buildPrompt(p: { rules: string; routines: PromptRoutine[]; library: PromptExercise[]; request: DraftRequest; today: string }): Prompt {
  const routines = [...p.routines].sort(byId).map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) }));
  const library = [...p.library].sort(byId).map(toPromptExercise);
  const system: SystemBlock[] = [
    { type: 'text', text: AGENT_INSTRUCTIONS },
    { type: 'text', text: AGENT_FORMAT },
    { type: 'text', text: `Правила админа:\n${p.rules.trim() || 'нет'}`, cache_control: cache },
    { type: 'text', text: `Разминки и заминки — id наборов (JSON):\n${JSON.stringify(routines)}` },
    { type: 'text', text: `Библиотека упражнений — id упражнений (JSON):\n${JSON.stringify(library)}`, cache_control: cache },
  ];
  const r = p.request;
  const lines = [
    `Сегодня ${p.today}. Тренировка на ${r.date}.`,
    r.title.trim() ? `Название: ${r.title.trim()}` : 'Название: придумай сам.',
    routineLine('Разминка', r.warmup),
    `Основная часть:\n${r.main.text.trim() || '(без описания)'}`,
    r.main.exercises.length ? `Выбраны из библиотеки (обязательно в основной части): ${r.main.exercises.join(', ')}` : 'Выбраны из библиотеки: нет',
    routineLine('Заминка', r.cooldown),
  ];
  if (r.errors?.length) lines.push(`Ошибки разбора прошлой попытки, исправь их:\n${r.errors.map((e) => `- ${e}`).join('\n')}`);
  return { system, user: lines.join('\n\n') };
}
