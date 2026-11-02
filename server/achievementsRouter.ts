import { Router } from 'express';
import type { Block, SessionStepResult } from '../shared/types';
import { buildAchievements } from './achievements';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { pausesOf } from './today';

/** «Достижения»: считаются из плана и выполненных тренировок вошедшего пользователя. */
export function achievementsRouter(db: Db) {
  const r = Router();
  r.get('/achievements', requireUser(db), (req, res) => {
    const userId = req.user!.id;
    const today = isDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
    const circuit = new Set<number>();
    for (const w of db.prepare('SELECT id, structure FROM workouts WHERE user_id = ?').all(userId) as Array<{ id: number; structure: string | null }>) {
      if (w.structure && (JSON.parse(w.structure) as Block[]).some((b) => b.mode === 'circuit')) circuit.add(w.id);
    }
    const entries = (db.prepare('SELECT date, workout_id FROM plan_entries WHERE user_id = ?').all(userId) as Array<{ date: string; workout_id: number }>).map((e) => ({ date: e.date, workoutId: e.workout_id }));
    const sessions = (db.prepare('SELECT workout_id, date, steps, videos FROM sessions_done WHERE user_id = ? ORDER BY date, id').all(userId) as Array<{ workout_id: number | null; date: string; steps: string; videos: number }>).map((s) => ({
      workoutId: s.workout_id,
      date: s.date,
      steps: JSON.parse(s.steps) as SessionStepResult[],
      videos: s.videos,
      hasCircuit: s.workout_id !== null && circuit.has(s.workout_id),
    }));
    res.json(buildAchievements({ today, entries, sessions, pauses: pausesOf(db, userId) }));
  });
  return r;
}
