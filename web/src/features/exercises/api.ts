import type { ExerciseDemo, ExerciseHistory, ExerciseHistoryResponse, ExercisesResponse, Gender, HistorySet, LibraryEntry } from '../../../../shared/types';
import { formatShortDate } from '../../shared/format';
import { DEFAULT_PARAMS, toExerciseInput, toExercisePatch } from './library';
import type { ExerciseDraft, LibraryExercise, SetResult } from './types';

/** Запросы вкладки «Упражнения» к серверу. Компоненты их не вызывают. */

/** Справочник сервера: название, тип, группа, мышцы, ролики. Снаряда у него нет, историю подмешивает withHistory. */
export function toLibraryExercise(e: LibraryEntry): LibraryExercise {
  return {
    id: e.id,
    name: e.name,
    aliases: e.aliases,
    kind: e.kind,
    group: e.group,
    muscles: e.muscles,
    notes: e.notes || undefined,
    demo: e.demo,
    equipment: 'Без снаряда',
    defaults: { ...DEFAULT_PARAMS },
    sessionsTotal: 0,
    sessions: [],
    trend: [],
  };
}

const setResult = (kind: LibraryExercise['kind'], s: HistorySet): SetResult =>
  kind === 'weight' ? { weight: s.weight ?? 0, reps: s.value } : kind === 'reps' ? { reps: s.value } : { seconds: s.value };

/** История с сервера поверх упражнения; нет истории — упражнение остаётся новым. Видео и комментарии в историю пока не приходят. */
export function withHistory(ex: LibraryExercise, h: ExerciseHistory | undefined): LibraryExercise {
  if (!h) return ex;
  return {
    ...ex,
    record: { ...setResult(ex.kind, h.record), date: formatShortDate(h.record.date) },
    sessionsTotal: h.sessionsTotal,
    trend: h.trend,
    sessions: h.sessions.map((s) => ({
      date: formatShortDate(s.date),
      sets: s.sets.map((x) => setResult(ex.kind, x)),
      ...(s.isRecord ? { isRecord: true } : {}),
      videos: [],
      comments: [],
    })),
  };
}

/** Сбой истории не мешает списку: упражнения показываются, как будто их ещё не выполняли */
async function fetchHistory(): Promise<Map<string, ExerciseHistory>> {
  const res = await fetch('/api/exercises/history', { credentials: 'same-origin' }).catch(() => null);
  if (!res?.ok) return new Map();
  const body = (await res.json().catch(() => null)) as ExerciseHistoryResponse | null;
  return new Map((body?.history ?? []).map((h) => [h.id, h]));
}

export async function fetchLibrary(): Promise<LibraryExercise[]> {
  const [res, history] = await Promise.all([fetch('/api/exercises').catch(() => null), fetchHistory()]);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  const body = (await res.json()) as ExercisesResponse;
  return body.exercises.map((e) => withHistory(toLibraryExercise(e), history.get(e.id)));
}

/** Сообщение из тела {error}, иначе по статусу */
async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (body && typeof body.error === 'string' && body.error) return new Error(body.error);
  if (res.status === 401) return new Error('Сессия закончилась: войдите заново');
  if (res.status === 403) return new Error('Упражнения меняют тренер и админ');
  if (res.status === 404) return new Error('Упражнение не найдено');
  return new Error(`Сервер ответил ${res.status}`);
}

async function send(url: string, method: string, body?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  }).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw await failure(res);
  return res;
}

/** Ответ сервера поверх локального упражнения: снаряд, параметры и история остаются как были */
export function mergeEntry(base: LibraryExercise, e: LibraryEntry, draft?: ExerciseDraft): LibraryExercise {
  const { equipment: _eq, defaults: _d, sessionsTotal: _s, sessions: _ss, trend: _t, ...server } = toLibraryExercise(e);
  return {
    ...base,
    ...server,
    ...(draft ? { equipment: draft.equipment || base.equipment, defaults: { ...draft.params } } : {}),
  };
}

export async function createExercise(draft: ExerciseDraft): Promise<LibraryExercise> {
  const res = await send('/api/exercises', 'POST', toExerciseInput(draft));
  const created = toLibraryExercise((await res.json()) as LibraryEntry);
  return { ...created, equipment: draft.equipment || created.equipment, defaults: { ...draft.params } };
}

export async function updateExercise(ex: LibraryExercise, draft: ExerciseDraft): Promise<LibraryExercise> {
  const res = await send(`/api/exercises/${encodeURIComponent(ex.id)}`, 'PATCH', toExercisePatch(draft, ex));
  return mergeEntry(ex, (await res.json()) as LibraryEntry, draft);
}

export async function deleteExercise(id: string): Promise<void> {
  await send(`/api/exercises/${encodeURIComponent(id)}`, 'DELETE');
}

/** Ролик чибика: файл уходит телом запроса. Возвращает актуальные ролики упражнения. */
export async function uploadDemo(id: string, gender: Gender, file: File): Promise<ExerciseDemo> {
  const res = await fetch(`/api/exercises/${encodeURIComponent(id)}/demo/${gender}`, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
    credentials: 'same-origin',
  }).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw await failure(res);
  return ((await res.json()) as LibraryEntry).demo ?? {};
}

export async function deleteDemo(id: string, gender: Gender): Promise<ExerciseDemo> {
  const res = await send(`/api/exercises/${encodeURIComponent(id)}/demo/${gender}`, 'DELETE');
  return ((await res.json()) as LibraryEntry).demo ?? {};
}
