import type { ExercisesResponse, LibraryEntry } from '../../../../shared/types';
import { DEFAULT_PARAMS, toExerciseInput, toExercisePatch } from './library';
import type { ExerciseDraft, LibraryExercise } from './types';

/** Запросы вкладки «Упражнения» к серверу. Компоненты их не вызывают. */

/** Сервер знает название, тип, группу и мышцы; снаряда, истории и рекордов у него пока нет */
export function toLibraryExercise(e: LibraryEntry): LibraryExercise {
  return {
    id: e.id,
    name: e.name,
    aliases: e.aliases,
    kind: e.kind,
    group: e.group,
    muscles: e.muscles,
    notes: e.notes || undefined,
    video: e.video || undefined,
    equipment: 'Без снаряда',
    defaults: { ...DEFAULT_PARAMS },
    sessionsTotal: 0,
    sessions: [],
    trend: [],
  };
}

export async function fetchLibrary(): Promise<LibraryExercise[]> {
  const res = await fetch('/api/exercises').catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  const body = (await res.json()) as ExercisesResponse;
  return body.exercises.map(toLibraryExercise);
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
