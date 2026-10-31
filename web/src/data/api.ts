/** Запросы к серверу. Эндпоинтов пока нет, поэтому отдаём фикстуры тем же интерфейсом, что будет у fetch. */
import type { CoachComment, Technique, Workout } from '../../../shared/types';
import type { LibraryExercise } from '../features/exercises/types';
import { achievementsFixture, exercisesFixture, planFixture, scheduleFixture, todayFixture, workoutComments, workoutFixture, workoutTechniques } from './fixtures';
import type { AchievementsData, PlanData, ScheduleData, TodayData } from './types';

export type WorkoutData = { workout: Workout; comments: CoachComment[]; techniques: Record<string, Technique> };

export const fetchToday = async (): Promise<TodayData> => todayFixture;
export const fetchAchievements = async (): Promise<AchievementsData> => achievementsFixture;
export const fetchSchedule = async (): Promise<ScheduleData> => scheduleFixture;
export const fetchWorkout = async (): Promise<WorkoutData> => ({
  workout: workoutFixture,
  comments: workoutComments,
  techniques: workoutTechniques,
});
export const fetchExercises = async (): Promise<LibraryExercise[]> => exercisesFixture;
export const fetchPlan = async (): Promise<PlanData> => planFixture;
