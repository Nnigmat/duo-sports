/** Хуки данных. Вызывать только из *Page.tsx, вниз данные уходят пропсами. */
import { useEffect, useState } from 'react';
import type { LibraryExercise } from '../features/exercises/types';
import { fetchAchievements, fetchExercises, fetchSchedule, fetchToday, fetchWorkout, type WorkoutData } from './api';
import type { AchievementsData, ScheduleData, TodayData } from './types';

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
export const useSchedule = (): Resource<ScheduleData> => useResource(fetchSchedule);
export const useWorkout = (): Resource<WorkoutData> => useResource(fetchWorkout);
export const useExercises = (): Resource<LibraryExercise[]> => useResource(fetchExercises);
