import type { SessionReviewResponse, VideoReviewResponse } from '../../../../shared/types';

/** Запросы разбора к серверу. Компоненты их не вызывают: страница передаёт колбэки. */

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Нет связи с сервером');
  }
  if (res.status === 401) throw new Error('Сессия закончилась: войдите заново');
  if (res.status === 403) throw new Error('Нет доступа к этому разбору');
  if (res.status === 404) throw new Error('Разбор не найден');
  if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
  return res;
}

const json = { 'content-type': 'application/json' };

/** Скрывает карточку разбора на «Сегодня» и гасит точку на колокольчике */
export const dismissNotification = async (id: number): Promise<void> => {
  await request(`/api/notifications/${id}/dismiss`, { method: 'POST' });
};

/** today — сегодня у клиента: по нему сервер подбирает подсказки к следующему занятию */
export const fetchSessionReview = async (sessionId: number, today: string): Promise<SessionReviewResponse> =>
  (await request(`/api/sessions/${sessionId}/review?date=${today}`)).json();

export const fetchVideoReview = async (videoId: string): Promise<VideoReviewResponse> =>
  (await request(`/api/sessions/video/${encodeURIComponent(videoId)}`)).json();

export type NewReply = { text: string; exerciseId?: string; sessionId?: number; videoId?: string; timecodeSec?: number };

/** Ответ или заметка спортсмена в его собственных данных */
export const postReply = async (athleteId: number, reply: NewReply): Promise<void> => {
  await request(`/api/athletes/${athleteId}/comments`, { method: 'POST', headers: json, body: JSON.stringify(reply) });
};
