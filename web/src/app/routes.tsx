import { Route, Routes } from 'react-router-dom';
import { AchievementsPage } from '../features/achievements';
import { ExercisesPage } from '../features/exercises';
import { TodayPage } from '../features/today';
import { WorkoutPage } from '../features/workout';
import { AppShell } from './AppShell/AppShell';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TodayPage />} />
        <Route path="exercises/*" element={<ExercisesPage />} />
        <Route path="progress/achievements" element={<AchievementsPage />} />
      </Route>
      {/* Тренировка на весь экран, без навигации */}
      <Route path="workout" element={<WorkoutPage />} />
    </Routes>
  );
}
