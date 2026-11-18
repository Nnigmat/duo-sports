import { DRAFT_TEXT_MAX, type AgentRoutine, type AgentWorkout, type DraftRequest, type DraftResponse, type RoutineAsk } from '../../../../shared/aiDraft';
import { parseImport, type ParseContext, type ParseIssue } from '../import/parse';
import { draftFromParsed } from './fromParsed';
import { repairAndParse, toAgentPath } from './repair';
import { agentToImportYaml } from './toImportDoc';
import type { BuilderDraft } from './types';

export type BuildResult = { ok: true; draft: BuilderDraft } | { ok: false; errors: ParseIssue[] };

/** Сервер принимает не больше 50 ошибок и каждую не длиннее DRAFT_TEXT_MAX, иначе отвечает 400 */
const ERRORS_MAX = 50;

const tail = (path: Array<string | number>) => path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${p}`)).join('');

/** Место ошибки в ответе агента: «blocks[1].exercises[0].sets», «warmup»; номер строки — только без пути. Агент YAML не видел */
function placeOf(i: ParseIssue, w: AgentWorkout): string | null {
  const at = i.path ? toAgentPath(i.path, w) : null;
  // Поле тренировки (blocks, notes) называется в ответе так же
  if (!at && i.path?.[0] === 'workouts' && i.path.length > 2) return tail(i.path.slice(2)).slice(1);
  if (!at || !i.path) return i.line ? `Строка ${i.line}` : null;
  const field = 'field' in at && at.field ? `.${at.field}` : '';
  if (at.at === 'exercise') return `blocks[${at.block}].exercises[${at.exercise}]${field}`;
  if (at.at === 'block') return `blocks[${at.block}]${field}`;
  if (at.at === 'newExercise') return `new_exercises[${at.index}]${tail(i.path.slice(2))}`;
  return i.path[0] === 'routines' ? `${at.which}.new_routine${tail(i.path.slice(2))}` : at.which;
}

const issueText = (i: ParseIssue, w: AgentWorkout) => {
  const place = placeOf(i, w);
  return `${place ? `${place}: ` : ''}${i.message}${i.hint ? ` (${i.hint})` : ''}`;
};

/** Готовая разминка или «Без разминки» — выбор тренера, ответ агента берётся только для «Описать свою» */
const routineOf = (ask: RoutineAsk, answer: AgentRoutine): AgentRoutine => (ask === null ? null : 'routine' in ask ? { routine: ask.routine } : answer);
const withChoice = (w: AgentWorkout, req: DraftRequest): AgentWorkout => ({ ...w, warmup: routineOf(req.warmup, w.warmup), cooldown: routineOf(req.cooldown, w.cooldown) });

/**
 * Запрос агенту → разбор ответа как импорта → черновик формы. Ошибки разбора — один повтор с этими ошибками;
 * не вышло и со второго раза — ремонт ответа по путям ошибок: черновик с пометками и «Не разобрал».
 * Ремонт не сошёлся — ошибки второго ответа наружу (ошибка программы). Ошибки сети и сервера летят как есть.
 */
export async function buildWorkout(req: DraftRequest, ctx: ParseContext, picked: string[], send: (r: DraftRequest) => Promise<DraftResponse>): Promise<BuildResult> {
  let request = req;
  let errors: ParseIssue[] = [];
  let last: AgentWorkout | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    last = withChoice((await send(request)).workout, req);
    const parsed = parseImport(agentToImportYaml(last, req.date), ctx);
    if (parsed.ok) return { ok: true, draft: draftFromParsed(parsed, last, ctx, req.date, picked) };
    errors = parsed.errors;
    const answer = last;
    request = { ...req, errors: errors.slice(0, ERRORS_MAX).map((i) => issueText(i, answer).slice(0, DRAFT_TEXT_MAX)) };
  }
  const fixed = repairAndParse(last!, errors, ctx, req.date, req.title);
  if (fixed.ok) return { ok: true, draft: draftFromParsed(fixed.parsed, fixed.workout, ctx, req.date, picked, fixed) };
  return { ok: false, errors };
}
