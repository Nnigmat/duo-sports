import type { DraftRequest, DraftResponse } from '../../../../shared/aiDraft';
import { parseImport, type ParseContext, type ParseIssue } from '../import/parse';
import { draftFromParsed } from './fromParsed';
import { agentToImportYaml } from './toImportDoc';
import type { BuilderDraft } from './types';

export type BuildResult = { ok: true; draft: BuilderDraft } | { ok: false; errors: ParseIssue[] };

const issueText = (i: ParseIssue) => `${i.line ? `Строка ${i.line}: ` : ''}${i.message}${i.hint ? ` (${i.hint})` : ''}`;

/**
 * Запрос агенту → разбор ответа как импорта → черновик формы. Ошибки разбора — один повтор с этими ошибками;
 * не вышло и со второго раза — ошибки наружу. Ошибки сети и сервера летят как есть.
 */
export async function buildWorkout(req: DraftRequest, ctx: ParseContext, picked: string[], send: (r: DraftRequest) => Promise<DraftResponse>): Promise<BuildResult> {
  let request = req;
  let errors: ParseIssue[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const { workout } = await send(request);
    const parsed = parseImport(agentToImportYaml(workout, req.date), ctx);
    if (parsed.ok) return { ok: true, draft: draftFromParsed(parsed, workout, ctx, req.date, picked) };
    errors = parsed.errors;
    request = { ...req, errors: errors.map(issueText) };
  }
  return { ok: false, errors };
}
