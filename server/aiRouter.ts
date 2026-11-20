import { Router } from 'express';
import { AGENT_WORKOUT_SCHEMA, compactAgentWorkout, DRAFT_TEXT_MAX, isAgentWorkout, type DraftRequest, type DraftResponse, type RoutineAsk } from '../shared/aiDraft';
import { AiError, type AiClient } from './aiClient';
import { buildPrompt, promptLibrary, promptRoutines } from './aiPrompt';
import { getAiRules } from './aiRules';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { canAddExercises, ensureLibrary, isDate } from './imports';
import { logger } from './logger';
import { canAccessAthlete } from './trainerLinks';

const UNAVAILABLE = 'Сборка недоступна';
const NO_ANSWER = 'Агент не ответил, попробуйте ещё раз';
/** Выбранных упражнений и ошибок прошлой попытки — не больше; длиннее — не ввод тренера */
const LIST_MAX = 50;

type Checked = { ok: true; value: DraftRequest } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.length <= DRAFT_TEXT_MAX;
const textList = (v: unknown) => Array.isArray(v) && v.length <= LIST_MAX && v.every(text);

/** Разминка или заминка из тела запроса; undefined — не по формату */
function parseRoutineAsk(v: unknown): RoutineAsk | undefined {
  if (v === null) return null;
  if (!isObj(v)) return undefined;
  if (typeof v.routine === 'string' && v.routine.length <= 200) return { routine: v.routine };
  if (text(v.text)) return { text: v.text as string };
  return undefined;
}

/** Тело запроса: поля и пределы; пустая основная часть (нет текста и выбранных упражнений) — отказ. */
export function validateDraftRequest(body: unknown): Checked {
  const fail = (error: string): Checked => ({ ok: false, error });
  if (!isObj(body)) return fail('Ждём JSON с date, main, warmup, cooldown');
  const { athleteId, date, title, main } = body;
  if (athleteId !== null && !Number.isInteger(athleteId)) return fail('athleteId: число или null');
  if (!isDate(date)) return fail('date: вида 2026-11-18');
  if (!text(title)) return fail(`title: строка до ${DRAFT_TEXT_MAX} символов`);
  if (!isObj(main) || !text(main.text) || !textList(main.exercises)) return fail(`main: text до ${DRAFT_TEXT_MAX} символов и exercises — список id`);
  const warmup = parseRoutineAsk(body.warmup);
  const cooldown = parseRoutineAsk(body.cooldown);
  if (warmup === undefined || cooldown === undefined) return fail(`warmup и cooldown: { routine }, { text } до ${DRAFT_TEXT_MAX} символов или null`);
  if (body.errors !== undefined && !textList(body.errors)) return fail('errors: список строк');
  const mainText = main.text as string;
  const exercises = main.exercises as string[];
  if (!mainText.trim() && exercises.length === 0) return fail('Опишите основную часть или выберите упражнения');
  return {
    ok: true,
    value: {
      athleteId: athleteId as number | null,
      date,
      title: title as string,
      warmup,
      main: { text: mainText, exercises },
      cooldown,
      ...(body.errors ? { errors: body.errors as string[] } : {}),
    },
  };
}

/** День сервера YYYY-MM-DD по местному времени: агенту, чтобы понимать «завтра» и дни недели */
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Сборка тренировки агентом: тренер и админ, для ученика — только своего. Без ключа — 503. */
export function aiRouter(db: Db, client: AiClient | null) {
  const r = Router();

  r.post('/ai/workout-draft', requireUser(db), async (req, res) => {
    const user = req.user!;
    if (!canAddExercises(user.role)) return void res.status(403).json({ error: 'Собирать тренировки могут тренер и админ' });
    if (!client) return void res.status(503).json({ error: UNAVAILABLE });
    const v = validateDraftRequest(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const request = v.value;
    if (request.athleteId !== null && !canAccessAthlete(db, user, request.athleteId)) return void res.status(403).json({ error: 'Нет доступа к ученику' });

    ensureLibrary(db);
    const prompt = buildPrompt({ rules: getAiRules(db).text, routines: promptRoutines(db), library: promptLibrary(db), request, today: localToday() });
    const started = Date.now();
    try {
      const { json: raw, usage } = await client.draft(prompt, AGENT_WORKOUT_SCHEMA);
      // Только пользователь, токены и время: текст ввода и ответа в лог не пишем
      logger.info({ userId: user.id, athleteId: request.athleteId, usage, ms: Date.now() - started }, 'ai draft');
      const json = compactAgentWorkout(raw);
      if (!isAgentWorkout(json)) {
        logger.warn({ userId: user.id }, 'ai draft: ответ не по схеме');
        return void res.status(502).json({ error: NO_ANSWER });
      }
      const body: DraftResponse = { workout: json, usage };
      res.json(body);
    } catch (e) {
      const status = e instanceof AiError ? e.status : undefined;
      const log = { userId: user.id, status, message: e instanceof Error ? e.message : 'unknown', ms: Date.now() - started };
      // 400 — API отклонил сам запрос (схему, параметры): ошибка у нас, повтор не поможет
      if (status === 400) {
        logger.error(log, 'ai draft rejected');
        return void res.status(503).json({ error: UNAVAILABLE });
      }
      logger.warn(log, 'ai draft failed');
      res.status(502).json({ error: NO_ANSWER });
    }
  });
  return r;
}
