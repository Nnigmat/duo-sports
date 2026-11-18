import { compactAgentWorkout, type AgentExercise, type AgentNewRoutine, type AgentWorkout } from '../../../../shared/aiDraft';
import type { LibraryEntry } from '../../../../shared/types';
import { parseImport, type ParseContext, type ParsedImport, type ParseIssue } from '../import/parse';
import { agentToImportYaml } from './toImportDoc';

/**
 * Ремонт ответа агента после второй неудачной попытки: по путям ошибок разбора поле убирается, нагрузка без
 * значения получает значение по умолчанию и пометку, неразборчивое уходит в «Не разобрал». Чистые функции.
 */

/** Пометка упражнения: агент написал wrote в поле field, разбор ответил message. Индексы — в отремонтированном ответе */
export interface DraftMark {
  blockIndex: number;
  exerciseIndex: number;
  field: string;
  wrote: string;
  message: string;
}
/** Что написал агент (имя или id) и почему это не подошло */
export interface Unparsed {
  what: string;
  message: string;
}

export type AgentPath =
  | { at: 'exercise'; block: number; exercise: number; field?: string }
  | { at: 'block'; block: number; field?: string }
  | { at: 'routine'; which: 'warmup' | 'cooldown' }
  | { at: 'newExercise'; index: number };

const isIndex = (v: unknown): v is number => typeof v === 'number';
const fieldAt = (v: unknown) => (typeof v === 'string' ? { field: v } : {});

/**
 * Путь ошибки в документе импорта → место в ответе агента. Документ строит agentToImportYaml: блок-ссылка
 * разминки (готовой или своей) стоит первым, заминки — последним; свои наборы лежат в routines в порядке
 * [разминка, заминка], новые упражнения — в exercises. Путь тренировки целиком — null.
 */
export function toAgentPath(path: Array<string | number>, w: AgentWorkout): AgentPath | null {
  const [top, k, ...rest] = path;
  if (top === 'exercises' && isIndex(k)) return { at: 'newExercise', index: k };
  if (top === 'routines' && isIndex(k)) {
    const own = (['warmup', 'cooldown'] as const).filter((which) => w[which] && 'new_routine' in w[which]);
    return own[k] ? { at: 'routine', which: own[k] } : null;
  }
  if (top !== 'workouts' || k !== 0 || rest[0] !== 'blocks' || !isIndex(rest[1])) return null;
  const [, i, key, j, field] = rest;
  const off = w.warmup ? 1 : 0;
  if (i < off) return { at: 'routine', which: 'warmup' };
  if (i >= off + w.blocks.length) return w.cooldown ? { at: 'routine', which: 'cooldown' } : null;
  const block = i - off;
  if (key === 'exercises' && isIndex(j)) return { at: 'exercise', block, exercise: j, ...fieldAt(field) };
  return { at: 'block', block, ...fieldAt(key) };
}

/** Поля блока, которые можно просто убрать; без title или text у note блок не спасти */
const BLOCK_SOFT = ['title', 'rounds', 'rest_sec', 'text'];
const EXERCISE_FIELDS = ['sets', 'reps', 'time_sec', 'weight_kg', 'rest_sec', 'sides', 'notes'] as const;
type Field = (typeof EXERCISE_FIELDS)[number];
const isField = (f: string | undefined): f is Field => (EXERCISE_FIELDS as readonly string[]).includes(f ?? '');

const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v));
const loadText = (e: AgentExercise) => (['reps', 'time_sec', 'weight_kg'] as const).filter((f) => e[f] !== undefined).map((f) => `${f}: ${show(e[f])}`).join(', ');

/**
 * Ответ агента и ошибки его разбора → исправленный ответ, пометки и «Не разобрал».
 * library — тип упражнения для нагрузки по умолчанию (как при ручном добавлении: reps 10 или 30 секунд).
 * prior — пометки прошлого круга по индексам w: они остаются у своих упражнений, у упражнения одна пометка.
 */
export function repairAgentWorkout(
  raw: AgentWorkout,
  issues: ParseIssue[],
  library: LibraryEntry[],
  prior: DraftMark[] = [],
): { workout: AgentWorkout; marks: DraftMark[]; unparsed: Unparsed[] } {
  const w = structuredClone(compactAgentWorkout(raw)) as AgentWorkout;
  const unparsed: Unparsed[] = [];
  const marks: Array<Array<DraftMark | undefined>> = w.blocks.map((b) => b.exercises.map(() => undefined));
  for (const m of prior) {
    const row = marks[m.blockIndex];
    if (row && m.exerciseIndex < row.length && !row[m.exerciseIndex]) row[m.exerciseIndex] = m;
  }

  const libById = new Map(library.map((l) => [l.id, l]));
  const newById = new Map(w.new_exercises.map((e) => [e.id, e]));
  const nameOf = (id: string) => libById.get(id)?.name ?? newById.get(id)?.name ?? id;

  /** Тип нагрузки по умолчанию: в timed всегда время, иначе по библиотеке или measure нового упражнения */
  function kindOf(id: string, timed: boolean): 'time' | 'reps' {
    if (timed) return 'time';
    const lib = libById.get(id);
    if (lib) return lib.kind === 'time' ? 'time' : 'reps';
    const m = newById.get(id)?.measure;
    return m === 'time' || m === 'distance' ? 'time' : 'reps';
  }

  const located = issues.flatMap((issue) => {
    const at = issue.path ? toAgentPath(issue.path, w) : null;
    return at ? [{ issue, at }] : [];
  });

  // Сначала целое: наборы, новые упражнения, блоки; потом упражнения уцелевших блоков
  const dropRoutine = new Set<'warmup' | 'cooldown'>();
  const dropNew = new Set<string>();
  const dropBlock = new Set<number>();
  const removedFields = new Set<string>();
  for (const { issue, at } of located) {
    if (at.at === 'routine') {
      const r = w[at.which];
      if (!r || dropRoutine.has(at.which)) continue;
      dropRoutine.add(at.which);
      unparsed.push({ what: 'new_routine' in r ? r.new_routine.title : r.routine, message: issue.message });
    } else if (at.at === 'newExercise') {
      const e = w.new_exercises[at.index];
      if (!e || dropNew.has(e.id)) continue;
      dropNew.add(e.id);
      unparsed.push({ what: e.name || e.id, message: issue.message });
    } else if (at.at === 'block') {
      const b = w.blocks[at.block] as unknown as Record<string, unknown> | undefined;
      if (!b || dropBlock.has(at.block)) continue;
      if (at.field && BLOCK_SOFT.includes(at.field) && b[at.field] !== undefined) {
        const key = `${at.block}:${at.field}`;
        if (removedFields.has(key)) continue;
        removedFields.add(key);
        unparsed.push({ what: `${at.field}: ${show(b[at.field])}`, message: issue.message });
        delete b[at.field];
        continue;
      }
      dropBlock.add(at.block);
      const block = w.blocks[at.block]!;
      const names = block.exercises.map((e) => nameOf(e.exercise_id));
      unparsed.push({ what: names.length ? names.join(', ') : (block.title ?? block.type), message: issue.message });
    }
  }

  const dropEx = new Set<AgentExercise>();
  const touched = new Map<AgentExercise, { block: number; exercise: number; field: string; wrote: string; message: string; weight?: string }>();
  for (const { issue, at } of located) {
    if (at.at !== 'exercise' || dropBlock.has(at.block)) continue;
    const e = w.blocks[at.block]?.exercises[at.exercise];
    if (!e || dropEx.has(e) || dropNew.has(e.exercise_id)) continue;
    if (at.field === 'exercise_id') {
      dropEx.add(e);
      unparsed.push({ what: e.exercise_id, message: issue.message });
      continue;
    }
    if (at.field !== undefined && !isField(at.field)) continue;
    if (at.field === 'notes') {
      // Заметка не нагрузка: убирается в «Не разобрал» и не блокирует сохранение
      unparsed.push({ what: `Заметка к «${nameOf(e.exercise_id)}»: ${show(e.notes)}`, message: issue.message });
      delete e.notes;
      continue;
    }
    const wrote = at.field ? show(e[at.field]) : loadText(e);
    const field = at.field ?? 'load';
    const seen = touched.get(e);
    if (!seen) touched.set(e, { block: at.block, exercise: at.exercise, field, wrote, message: issue.message, ...(field === 'weight_kg' ? { weight: wrote } : {}) });
    else if (field === 'weight_kg') seen.weight ??= wrote;
    else if (seen.field === 'weight_kg') {
      // Пометка про главное: про вес достаточно приписки к ней
      Object.assign(seen, { field, wrote, message: issue.message });
    }
    if (at.field) delete e[at.field];
    else if (e.reps !== undefined && e.time_sec !== undefined) {
      // Две нагрузки: остаётся та, что по типу упражнения
      if (kindOf(e.exercise_id, w.blocks[at.block]!.type === 'timed') === 'time') delete e.reps;
      else delete e.time_sec;
    }
  }

  // Нагрузка после ремонта: вес только к повторам; без нагрузки — по умолчанию
  for (const [e, t] of touched) {
    if (e.reps === undefined && e.time_sec === undefined) {
      if (kindOf(e.exercise_id, w.blocks[t.block]!.type === 'timed') === 'time') e.time_sec = 30;
      else e.reps = '10';
    }
    // Вес к времени не бывает: он уходит из ответа, но остаётся в тексте пометки
    const weight = t.weight ?? (e.reps === undefined && e.weight_kg !== undefined ? show(e.weight_kg) : undefined);
    const wrote = weight !== undefined && t.field !== 'weight_kg' ? `${t.wrote}, ${weight} кг` : t.wrote;
    if (e.reps === undefined) delete e.weight_kg;
    const row = marks[t.block]!;
    row[t.exercise] ??= { blockIndex: t.block, exerciseIndex: t.exercise, field: t.field, wrote, message: t.message };
  }

  // Удаления: упражнения со ссылкой на убранное новое, опустевшие блоки и наборы
  const keepEx = (e: AgentExercise) => !dropEx.has(e) && !dropNew.has(e.exercise_id);
  const blocks: AgentWorkout['blocks'] = [];
  const finalMarks: DraftMark[] = [];
  w.blocks.forEach((b, bi) => {
    if (dropBlock.has(bi)) return;
    const kept = b.exercises.flatMap((e, ei) => (keepEx(e) ? [{ e, mark: marks[bi]![ei] }] : []));
    if (b.type !== 'note' && kept.length === 0) return;
    kept.forEach(({ mark }, ei) => {
      if (mark) finalMarks.push({ ...mark, blockIndex: blocks.length, exerciseIndex: ei });
    });
    blocks.push({ ...b, exercises: kept.map((k) => k.e) });
  });

  const routineOf = (which: 'warmup' | 'cooldown') => {
    const r = w[which];
    if (!r || dropRoutine.has(which)) return null;
    if (!('new_routine' in r)) return r;
    const exercises = r.new_routine.exercises.filter((i) => !dropNew.has(i.exercise_id));
    if (exercises.length) return { new_routine: { ...r.new_routine, exercises } satisfies AgentNewRoutine };
    // Набор держался только на убранных новых упражнениях: о них уже сказано в «Не разобрал»
    return null;
  };

  return {
    workout: { ...w, warmup: routineOf('warmup'), cooldown: routineOf('cooldown'), blocks, new_exercises: w.new_exercises.filter((e) => !dropNew.has(e.id)) },
    marks: finalMarks,
    unparsed,
  };
}

/** Кругов «разбор → ремонт»: незнакомое поле блока прячет ошибки его упражнений до следующего разбора */
export const REPAIR_ROUNDS = 3;

/**
 * Ремонт по кругу, пока разбор не пройдёт: не больше REPAIR_ROUNDS раз. Круг без изменений или исчерпанные
 * круги — { ok: false }: ответ не спасти, это ошибка программы.
 */
export function repairAndParse(
  start: AgentWorkout,
  issues: ParseIssue[],
  ctx: ParseContext,
  date: string,
): { ok: true; parsed: ParsedImport; workout: AgentWorkout; marks: DraftMark[]; unparsed: Unparsed[] } | { ok: false } {
  let w = start;
  let left = issues;
  let marks: DraftMark[] = [];
  const unparsed: Unparsed[] = [];
  for (let round = 0; round < REPAIR_ROUNDS; round++) {
    const r = repairAgentWorkout(w, left, ctx.library, marks);
    if (JSON.stringify(r.workout) === JSON.stringify(compactAgentWorkout(w))) break;
    w = r.workout;
    marks = r.marks;
    unparsed.push(...r.unparsed);
    const parsed = parseImport(agentToImportYaml(w, date), ctx);
    if (parsed.ok) return { ok: true, parsed, workout: w, marks, unparsed };
    left = parsed.errors;
  }
  return { ok: false };
}
