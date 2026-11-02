import { Route, Routes } from 'react-router-dom';
import { LoginPage, ProfilePage } from '../features/auth';
import { AchievementsPage } from '../features/achievements';
import { ExercisesPage } from '../features/exercises';
import { ImportPage } from '../features/import';
import { PlanPage } from '../features/plan';
import { ReviewPage, VideoReviewPage } from '../features/review';
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
          <Route path="import/*" element={<ImportPage />} />
          <Route path="exercises/*" element={<ExercisesPage />} />
          <Route path="progress/achievements" element={<AchievementsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* Разбор и тренировка на весь экран, без навигации */}
        <Route path="review/:sessionId" element={<ReviewPage />} />
        <Route path="review/video/:videoId" element={<VideoReviewPage />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="workout/:id" element={<WorkoutPage />} />
      </Route>
    </Routes>
  );
}
