/** Хуки данных. Вызывать только из *Page.tsx, вниз данные уходят пропсами. */
import { useCallback, useEffect, useState } from 'react';
import type { LibraryExercise } from '../features/exercises/types';
import type { AthleteListResponse, AthleteSessionsResponse, ExerciseCommentItem, MeasurementsResponse, SessionReviewResponse, VideoReviewResponse, Workout } from '../../../shared/types';
import { fetchSessionReview, fetchVideoReview } from '../features/review/api';
import { toIso } from '../features/plan/plan';
import { fetchAthletePlan, fetchAthletePreview, fetchAthleteSessions, fetchAthletes, fetchExerciseComments, fetchPlannedWorkout } from '../features/trainer/api';
import type { AthleteFilter } from '../features/trainer/students';
import { fetchAchievements, fetchExercises, fetchMeasurements, fetchImport, fetchPlan, toPlanData, fetchWorkoutById, fetchSchedule, fetchToday, type WorkoutData } from './api';
import type { AchievementsData, ImportData, PlanData, ScheduleData, TodayData } from './types';

export type Resource<T> = { data: T | null; error: string | null };

function useResource<T>(load: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ data, error: null }),
      (e: unknown) => alive && setState({ data: null, error: e instanceof Error ? e.message : 'Ошибка загрузки' }),
    );
    return () => {
      alive = false;
    };
  }, [load]);
  return state;
}

export const useToday = (): Resource<TodayData> => useResource(fetchToday);
export const useAchievements = (): Resource<AchievementsData> => useResource(fetchAchievements);
export const useMeasurements = (version = 0): Resource<MeasurementsResponse> =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: version — триггер повторной загрузки
  useResource(useCallback(() => fetchMeasurements(), [version]));
/** Замеры ученика глазами тренера */
export const useAthleteMeasurements = (athleteId: number, version = 0): Resource<MeasurementsResponse> =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: version — триггер повторной загрузки
  useResource(useCallback(() => fetchMeasurements(athleteId), [athleteId, version]));
export const useSchedule = (from?: string, base?: string): Resource<ScheduleData> => useResource(useCallback(() => fetchSchedule(from, base), [from, base]));
export const useExercises = (): Resource<LibraryExercise[]> => useResource(fetchExercises);
export const usePlan = (): Resource<PlanData> => useResource(fetchPlan);
export const useImport = (base?: string): Resource<ImportData> => useResource(useCallback(() => fetchImport(base), [base]));
export const useWorkoutById = (id: string): Resource<WorkoutData> => useResource(useCallback(() => fetchWorkoutById(id), [id]));
export const useSessionReview = (sessionId: number): Resource<SessionReviewResponse> =>
  useResource(useCallback(() => fetchSessionReview(sessionId, toIso(new Date())), [sessionId]));
export const useVideoReview = (videoId: string): Resource<VideoReviewResponse> => useResource(useCallback(() => fetchVideoReview(videoId), [videoId]));


// ── Кабинет тренера ───────────────────────────────────────
// version растёт после записи (комментарий, «разобрано»): данные читаются заново, а открытые панели остаются на месте.

export const useAthletes = (filter: AthleteFilter, q: string): Resource<AthleteListResponse> =>
  useResource(useCallback(() => fetchAthletes(toIso(new Date()), filter, q), [filter, q]));
export const useAthletePlan = (athleteId: number, version = 0): Resource<PlanData> =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: version — триггер повторной загрузки
  useResource(useCallback(() => fetchAthletePlan(athleteId).then(toPlanData), [athleteId, version]));
/** Тренировка ученика для превью: с комментариями и техникой, ученик ничего не «прочитывает» */
export const useAthletePreview = (athleteId: number, workoutId: number): Resource<WorkoutData> =>
  useResource(useCallback(() => fetchAthletePreview(athleteId, workoutId), [athleteId, workoutId]));
export const useAthleteSessions = (athleteId: number, version = 0): Resource<AthleteSessionsResponse> =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: version — триггер повторной загрузки
  useResource(useCallback(() => fetchAthleteSessions(athleteId, toIso(new Date())), [athleteId, version]));
/** Разбор выполненной тренировки глазами тренера; null — выбрана не выполненная */
export const useTrainerReview = (sessionId: number | null, version = 0): Resource<SessionReviewResponse | null> =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: version — триггер повторной загрузки
  useResource(useCallback(() => (sessionId === null ? Promise.resolve(null) : fetchSessionReview(sessionId, toIso(new Date()))), [sessionId, version]));
/** Состав запланированной тренировки; workout: null — состава нет (импорт без блоков). Сам data: null, пока идёт загрузка. */
export const usePlannedWorkout = (athleteId: number, workoutId: number | null): Resource<{ workout: Workout | null }> =>
  useResource(
    useCallback(
      () =>
        workoutId === null
          ? Promise.resolve({ workout: null })
          : fetchPlannedWorkout(athleteId, workoutId).then(
              (workout) => ({ workout }),
              (e: unknown) => (e instanceof Error && e.message === 'Не найдено' ? { workout: null } : Promise.reject(e)),
            ),
      [athleteId, workoutId],
    ),
  );
/** Прошлые комментарии по названиям упражнений (кроме тренировки exclude) */
export const usePastComments = (athleteId: number, names: string[], exclude: number | null): Resource<Record<string, ExerciseCommentItem[]>> => {
  const key = names.join('\u0000');
  return useResource(
    useCallback(async () => {
      const list = key ? key.split('\u0000') : [];
      const all = await Promise.all(list.map((n) => fetchExerciseComments(athleteId, n, exclude ?? undefined)));
      return Object.fromEntries(list.map((n, i) => [n, all[i]!]));
    }, [athleteId, key, exclude]),
  );
};
