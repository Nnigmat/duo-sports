import type { Routine, RoutineDetail, RoutineInput, RoutineKind, RoutinesResponse, RoutineSummary } from '../../../../shared/types';

/** Запросы вкладки «Разминки». Компоненты их не вызывают. */

/** Отказ сервера; при 409 на удалении несёт тренировки, где стоит разминка */
export class RoutineError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly workouts: Array<{ workoutId: number; title: string }> = [],
  ) {
    super(message);
  }
}

async function failure(res: Response): Promise<RoutineError> {
  const body = (await res.json().catch(() => null)) as { error?: unknown; workouts?: unknown } | null;
  const workouts = Array.isArray(body?.workouts) ? (body.workouts as Array<{ workoutId: number; title: string }>) : [];
  if (body && typeof body.error === 'string' && body.error) return new RoutineError(body.error, res.status, workouts);
  if (res.status === 401) return new RoutineError('Сессия закончилась: войдите заново', 401);
  if (res.status === 403) return new RoutineError('Разминки меняют тренер и админ', 403);
  if (res.status === 404) return new RoutineError('Разминка не найдена', 404);
  return new RoutineError(`Сервер ответил ${res.status}`, res.status);
}

async function send(url: string, method = 'GET', body?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  }).catch(() => null);
  if (!res) throw new RoutineError('Нет связи с сервером', 0);
  if (!res.ok) throw await failure(res);
  return res;
}

/** Все разминки и заминки одним запросом: счётчики на переключателе берутся отсюда */
export async function fetchRoutines(): Promise<RoutineSummary[]> {
  const res = await send('/api/routines');
  return ((await res.json()) as RoutinesResponse).routines;
}

export async function fetchRoutine(id: string): Promise<RoutineDetail> {
  const res = await send(`/api/routines/${encodeURIComponent(id)}`);
  return (await res.json()) as RoutineDetail;
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  const res = await send('/api/routines', 'POST', input);
  return (await res.json()) as Routine;
}

export async function updateRoutine(id: string, input: RoutineInput): Promise<Routine> {
  const res = await send(`/api/routines/${encodeURIComponent(id)}`, 'PUT', input);
  return (await res.json()) as Routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  await send(`/api/routines/${encodeURIComponent(id)}`, 'DELETE');
}

export type { RoutineKind };
