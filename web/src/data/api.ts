/** Запросы к серверу. Эндпоинтов пока нет, поэтому отдаём фикстуры тем же интерфейсом, что будет у fetch. */
import type { CoachComment, Gender, PlanResponse, Technique, TodayResponse, Workout, WorkoutResponse } from '../../../shared/types';
import { fetchLibrary } from '../features/exercises/api';
import type { LibraryExercise } from '../features/exercises/types';
import { achievementsFixture, planFixture } from './fixtures';
import { fetchImportContext } from '../features/import/api';
import { fetchPlanResponse } from '../features/plan/api';
import { fetchScheduleResponse } from '../features/schedule/api';
import { applyMoves, planBounds, toIso } from '../features/plan/plan';
import type { AchievementsData, ImportData, PlanData, ScheduleData, TodayData } from './types';

export type WorkoutData = { workout: Workout; comments: CoachComment[]; techniques: Record<string, Technique>; gender?: Gender };

/** «Сегодня» собирает сервер; дату знает браузер. Блока insights пока нет. */
export const fetchToday = async (): Promise<TodayData> => {
  const res = await fetch(`/api/today?date=${toIso(new Date())}`).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  return (await res.json()) as TodayResponse;
};
/** Достижения считает сервер по выполненным тренировкам */
export const fetchAchievements = async (): Promise<AchievementsData> => {
  const res = await fetch(`/api/achievements?date=${toIso(new Date())}`).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  return (await res.json()) as AchievementsData;
};
export const fetchSchedule = async (from?: string, base?: string): Promise<ScheduleData> => fetchScheduleResponse(toIso(new Date()), from, base);
export const fetchExercises = (): Promise<LibraryExercise[]> => fetchLibrary();
/** План — с сервера; сегодня знает браузер, границы календаря считаются по записям */
export const fetchPlan = async (): Promise<PlanData> => toPlanData(await fetchPlanResponse());
/** Ответ сервера в данные экрана «План»; общий для спортсмена и тренера */
export const toPlanData = (response: PlanResponse): PlanData => {
  const entries = applyMoves(response.entries, response.moves ?? []);
  const today = toIso(new Date());
  return { today, ...planBounds(today, Object.keys(entries)), templates: response.templates, entries };
};
/** Библиотека и план — с сервера; «сегодня» знает браузер, у него свой часовой пояс */
export const fetchImport = async (base?: string): Promise<ImportData> => {
  const context = await fetchImportContext(base);
  return { ...context, today: toIso(new Date()) };
};

/** Тренировка с сервера: блоки, комментарии тренера и описания техники из библиотеки упражнений */
export const fetchWorkoutById = async (id: string): Promise<WorkoutData> => {
  const res = await fetch(`/api/workouts/${encodeURIComponent(id)}`).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (res.status === 404) throw new Error('Тренировка не найдена или импортирована без блоков для выполнения: импортируйте её заново');
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Сервер ответил ${res.status}`);
  return (await res.json()) as WorkoutResponse;
};
