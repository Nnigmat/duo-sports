import { Route, Routes } from 'react-router-dom';
import { LoginPage, ProfilePage } from '../features/auth';
import { AchievementsPage } from '../features/achievements';
import { EquipmentPage } from '../features/equipment';
import { ExercisesPage } from '../features/exercises';
import { ImportPage } from '../features/import';
import { MeasureFormPage, MeasureStatsPage } from '../features/measurements';
import { PlanPage } from '../features/plan';
import { RoutinesPage } from '../features/routines';
import { ReviewPage, VideoReviewPage } from '../features/review';
import { AthleteImportPage, AthleteMeasurementsPage, AthletePage, AthletePlanPage, OwnWorkoutEditPage, StudentsPage, WorkoutEditPage, WorkoutPreviewPage } from '../features/trainer';
import { TodayPage } from '../features/today';
import { ResumeFeedback, WorkoutPage } from '../features/workout';
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
                <ResumeFeedback>
                  <TodayPage />
                </ResumeFeedback>
              </HomeRedirect>
            }
          />
          <Route path="trainer" element={<RequireTrainer />}>
            <Route index element={<StudentsPage />} />
            <Route path="athletes/:id" element={<AthletePage />} />
            <Route path="athletes/:id/plan" element={<AthletePlanPage />} />
            <Route path="athletes/:id/measurements" element={<AthleteMeasurementsPage />} />
            <Route path="athletes/:id/workouts/:wid/edit" element={<WorkoutEditPage />} />
            <Route path="athletes/:id/import/*" element={<AthleteImportPage />} />
          </Route>
          <Route element={<RequireTrainer />}>
            <Route path="equipment" element={<EquipmentPage />} />
          </Route>
          <Route path="plan" element={<PlanPage />} />
          <Route path="plan/workouts/:wid/edit" element={<OwnWorkoutEditPage />} />
          <Route path="import/*" element={<ImportPage />} />
          <Route path="exercises/*" element={<ExercisesPage />} />
          <Route path="routines/*" element={<RoutinesPage />} />
          <Route path="progress/achievements" element={<AchievementsPage />} />
          <Route path="progress/measurements" element={<MeasureStatsPage />} />
          <Route path="progress/measurements/new" element={<MeasureFormPage />} />
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
