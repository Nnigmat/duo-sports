import { Router } from 'express';
import type { RoutineKind, RoutinesResponse } from '../shared/types';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { canAddExercises } from './imports';
import {
  createRoutine, deleteRoutine, getRoutine, listRoutines, ROUTINE_DUPLICATE, ROUTINE_IN_USE, ROUTINE_KIND_IN_USE,
  ROUTINE_NOT_FOUND, ROUTINE_NOT_TIME, ROUTINE_UNKNOWN_EXERCISE, ROUTINES_WRITE_FORBIDDEN, updateRoutine, validateRoutine,
} from './routines';

const FAIL = {
  unknown_exercise: [400, ROUTINE_UNKNOWN_EXERCISE],
  not_time: [400, ROUTINE_NOT_TIME],
  duplicate: [409, ROUTINE_DUPLICATE],
  not_found: [404, ROUTINE_NOT_FOUND],
  in_use: [409, ROUTINE_KIND_IN_USE],
} as const;

/** Общая библиотека разминок и заминок: читает любой вошедший, меняют тренер и админ. */
export function routinesRouter(db: Db) {
  const r = Router();
  const auth = requireUser(db);

  r.get('/routines', auth, (req, res) => {
    const kind = req.query.kind;
    if (kind !== undefined && kind !== 'warmup' && kind !== 'cooldown') return void res.status(400).json({ error: 'kind: warmup или cooldown' });
    const body: RoutinesResponse = { routines: listRoutines(db, kind as RoutineKind | undefined) };
    res.json(body);
  });

  r.get('/routines/:id', auth, (req, res) => {
    const d = getRoutine(db, String(req.params.id), req.user!.id);
    if (!d) return void res.status(404).json({ error: ROUTINE_NOT_FOUND });
    res.json(d);
  });

  r.post('/routines', auth, (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: ROUTINES_WRITE_FORBIDDEN });
    const v = validateRoutine(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const result = createRoutine(db, v.value);
    if (!result.ok) {
      const [status, error] = FAIL[result.error];
      return void res.status(status).json({ error });
    }
    res.status(201).json(result.routine);
  });

  r.put('/routines/:id', auth, (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: ROUTINES_WRITE_FORBIDDEN });
    const v = validateRoutine(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const result = updateRoutine(db, String(req.params.id), v.value);
    if (!result.ok) {
      const [status, error] = FAIL[result.error];
      return void res.status(status).json({ error });
    }
    res.json(result.routine);
  });

  r.delete('/routines/:id', auth, (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: ROUTINES_WRITE_FORBIDDEN });
    const result = deleteRoutine(db, String(req.params.id));
    if (!result.ok) {
      if (result.error === 'not_found') return void res.status(404).json({ error: ROUTINE_NOT_FOUND });
      return void res.status(409).json({ error: ROUTINE_IN_USE, workouts: result.workouts });
    }
    res.status(204).end();
  });
  return r;
}
