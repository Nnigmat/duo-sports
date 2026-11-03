import type { ScheduleResponse } from '../../../../shared/types';

/** Запросы переноса к серверу. Компоненты их не вызывают: страница передаёт колбэки. */

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Нет связи с сервером');
  }
  if (res.status === 404) throw new Error('Нет тренировки, которую можно перенести');
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  return res;
}

/** base — «/api» у спортсмена, «/api/trainer/athletes/:id» у тренера в плане ученика */
/** from — день тренировки, которую переносим; без него — сегодняшняя */
export const fetchScheduleResponse = async (today: string, from?: string, base = '/api'): Promise<ScheduleResponse> =>
  (await request(`${base}/schedule?date=${today}${from ? `&from=${from}` : ''}`)).json();

/** Переносит невыполненную тренировку дня from на день to */
export const moveWorkout = (today: string, from: string, to: string, base = '/api') =>
  request(`${base}/schedule/move`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ today, from, to }) });

/** Пропускает тренировку дня from: в плане она остаётся, но серия её не засчитывает */
export const skipWorkout = (from: string, base = '/api') =>
  request(`${base}/schedule/skip`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ from }) });

/** Возвращает пропущенную тренировку дня from в план */
export const unskipWorkout = (from: string) => request(`/api/schedule/skip?from=${from}`, { method: 'DELETE' });

/** Ставит план на паузу с from по to включительно */
export const pausePlan = (from: string, to: string, base = '/api') =>
  request(`${base}/schedule/pause`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ from, to }) });

/** Возобновляет план с дня date */
export const resumePlan = (date: string) => request(`/api/schedule/pause?date=${date}`, { method: 'DELETE' });
