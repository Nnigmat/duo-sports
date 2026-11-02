import type { AthleteListResponse, AthleteSessionsResponse, ExerciseCommentItem, Workout } from '../../../../shared/types';
import type { AthleteFilter } from './students';

/** Запросы кабинета тренера. Компоненты их не вызывают: страница передаёт колбэки. */

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Нет связи с сервером');
  }
  if (res.status === 401) throw new Error('Сессия закончилась: войдите заново');
  if (res.status === 403) throw new Error('Нет доступа к этому ученику');
  if (res.status === 404) throw new Error('Не найдено');
  if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
  return res;
}

const json = { 'content-type': 'application/json' };

/** today — сегодня у клиента; фильтр и поиск считает сервер */
export const fetchAthletes = async (today: string, filter: AthleteFilter, q: string): Promise<AthleteListResponse> => {
  const params = new URLSearchParams({ date: today, filter });
  if (q.trim()) params.set('q', q.trim());
  return (await request(`/api/trainer/athletes?${params}`)).json();
};

export const fetchAthleteSessions = async (athleteId: number, today: string): Promise<AthleteSessionsResponse> =>
  (await request(`/api/trainer/athletes/${athleteId}/sessions?date=${today}`)).json();

/** Состав запланированной тренировки; Workout.id там строка с номером тренировки */
export const fetchPlannedWorkout = async (athleteId: number, workoutId: number): Promise<Workout> =>
  (await request(`/api/trainer/athletes/${athleteId}/workouts/${workoutId}`)).json();

export const fetchExerciseComments = async (athleteId: number, exercise: string, excludeSessionId?: number): Promise<ExerciseCommentItem[]> => {
  const params = new URLSearchParams({ exercise });
  if (excludeSessionId !== undefined) params.set('exclude', String(excludeSessionId));
  const body = (await (await request(`/api/trainer/athletes/${athleteId}/exercise-comments?${params}`)).json()) as { comments: ExerciseCommentItem[] };
  return body.comments;
};

/** «Отметить тренировку разобранной» */
export const markReviewed = async (sessionId: number): Promise<void> => {
  await request(`/api/trainer/sessions/${sessionId}/reviewed`, { method: 'POST' });
};

/** Подсказка к упражнению ближайшего занятия по тренировке */
export const postHint = async (athleteId: number, hint: { workoutId: number; exerciseId: string; text: string }): Promise<void> => {
  await request(`/api/trainer/athletes/${athleteId}/hints`, { method: 'POST', headers: json, body: JSON.stringify(hint) });
};

export type NewComment = { text: string; exerciseId?: string; sessionId?: number; videoId?: string; timecodeSec?: number };

/** Комментарий тренера: к упражнению, к видео или ко всей тренировке */
export const postComment = async (athleteId: number, comment: NewComment): Promise<void> => {
  await request(`/api/athletes/${athleteId}/comments`, { method: 'POST', headers: json, body: JSON.stringify(comment) });
};
