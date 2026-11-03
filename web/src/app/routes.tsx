import { Route, Routes } from 'react-router-dom';
import { LoginPage, ProfilePage } from '../features/auth';
import { AchievementsPage } from '../features/achievements';
import { ExercisesPage } from '../features/exercises';
import { ImportPage } from '../features/import';
import { PlanPage } from '../features/plan';
import { ReviewPage, VideoReviewPage } from '../features/review';
import { AthleteImportPage, AthletePage, AthletePlanPage, StudentsPage, WorkoutPreviewPage } from '../features/trainer';
import { TodayPage } from '../features/today';
import { WorkoutPage } from '../features/workout';
import { AppShell } from './AppShell/AppShell';
import { RequireAuth } from './auth/RequireAuth';
import { HomeRedirect, RequireTrainer } from './auth/RequireRole';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <HomeRedirect>
                <TodayPage />
              </HomeRedirect>
            }
          />
          <Route path="trainer" element={<RequireTrainer />}>
            <Route index element={<StudentsPage />} />
            <Route path="athletes/:id" element={<AthletePage />} />
            <Route path="athletes/:id/plan" element={<AthletePlanPage />} />
            <Route path="athletes/:id/import/*" element={<AthleteImportPage />} />
          </Route>
          <Route path="plan" element={<PlanPage />} />
          <Route path="import/*" element={<ImportPage />} />
          <Route path="exercises/*" element={<ExercisesPage />} />
          <Route path="progress/achievements" element={<AchievementsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="review/video/:videoId" element={<VideoReviewPage />} />
        </Route>
        {/* Разбор ученика и тренировка на весь экран, без навигации */}
        <Route path="review/:sessionId" element={<ReviewPage />} />
        {/* Превью тренировки ученика: на весь экран, только для тренера */}
        <Route element={<RequireTrainer />}>
          <Route path="trainer/athletes/:id/preview/:wid" element={<WorkoutPreviewPage />} />
        </Route>
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="workout/:id" element={<WorkoutPage />} />
      </Route>
    </Routes>
  );
}
