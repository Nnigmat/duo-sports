import type { Block, PlanResponse, Workout } from '../../../../shared/types';

/** Запросы плана к серверу. Компоненты их не вызывают: страница передаёт колбэки. */

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Нет связи с сервером');
  }
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  return res;
}

export const fetchPlanResponse = async (): Promise<PlanResponse> => (await request('/api/plan')).json();

/** Ставит тренировку в день, заменяя стоявшую */
export const putDay = (date: string, workoutId: string) =>
  request(`/api/plan/entries/${date}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workoutId: Number(workoutId) }) });

export const deleteDay = (date: string) => request(`/api/plan/entries/${date}`, { method: 'DELETE' });

/** Состав своей тренировки для редактора; комментарии не помечаются прочитанными */
export const fetchOwnWorkout = async (workoutId: number): Promise<Workout> => (await request(`/api/workouts/${workoutId}/plan`)).json();

export const putOwnWorkout = async (workoutId: number, title: string, blocks: Block[]): Promise<Workout> =>
  (await request(`/api/workouts/${workoutId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, blocks }) })).json();
