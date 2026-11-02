/** Хуки данных. Вызывать только из *Page.tsx, вниз данные уходят пропсами. */
import { useCallback, useEffect, useState } from 'react';
import type { LibraryExercise } from '../features/exercises/types';
import type { SessionReviewResponse, VideoReviewResponse } from '../../../shared/types';
import { fetchSessionReview, fetchVideoReview } from '../features/review/api';
import { toIso } from '../features/plan/plan';
import { fetchAchievements, fetchExercises, fetchImport, fetchPlan, fetchWorkoutById, fetchSchedule, fetchToday, type WorkoutData } from './api';
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
export const useSchedule = (from?: string): Resource<ScheduleData> => useResource(useCallback(() => fetchSchedule(from), [from]));
export const useExercises = (): Resource<LibraryExercise[]> => useResource(fetchExercises);
export const usePlan = (): Resource<PlanData> => useResource(fetchPlan);
export const useImport = (): Resource<ImportData> => useResource(fetchImport);
export const useWorkoutById = (id: string): Resource<WorkoutData> => useResource(useCallback(() => fetchWorkoutById(id), [id]));
export const useSessionReview = (sessionId: number): Resource<SessionReviewResponse> =>
  useResource(useCallback(() => fetchSessionReview(sessionId, toIso(new Date())), [sessionId]));
export const useVideoReview = (videoId: string): Resource<VideoReviewResponse> => useResource(useCallback(() => fetchVideoReview(videoId), [videoId]));
