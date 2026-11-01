import { Route, Routes } from 'react-router-dom';
import { LoginPage, ProfilePage } from '../features/auth';
import { AchievementsPage } from '../features/achievements';
import { ExercisesPage } from '../features/exercises';
import { PlanPage } from '../features/plan';
import { TodayPage } from '../features/today';
import { WorkoutPage } from '../features/workout';
import { AppShell } from './AppShell/AppShell';
import { RequireAuth } from './auth/RequireAuth';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="exercises/*" element={<ExercisesPage />} />
          <Route path="progress/achievements" element={<AchievementsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* Тренировка на весь экран, без навигации */}
        <Route path="workout" element={<WorkoutPage />} />
      </Route>
    </Routes>
  );
}
