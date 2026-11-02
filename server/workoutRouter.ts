import { Router } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { addComment, validateComment } from './comments';
import { saveSession, validateSession, workoutResponse } from './workouts';

/** Тренировка для выполнения и запись результата. Всё про данные вошедшего пользователя. */
export function workoutRouter(db: Db) {
  const r = Router();
  r.use('/workouts', requireUser(db));

  r.get('/workouts/:id', (req, res) => {
    const id = Number(req.params.id);
    const workout = Number.isInteger(id) ? workoutResponse(db, req.user!.id, id) : null;
    if (!workout) return void res.status(404).json({ error: 'not_found' });
    res.json(workout);
  });

  r.post('/workouts/:id/sessions', (req, res) => {
    const id = Number(req.params.id);
    const v = validateSession(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const saved = Number.isInteger(id) ? saveSession(db, req.user!.id, id, v.result) : ({ ok: false, error: 'not_found' } as const);
    if (!saved.ok) return void res.status(404).json({ error: saved.error });
    res.status(201).json({ id: saved.id });
  });

  /** Комментарий тренера или админа спортсмену: к упражнению из его библиотеки или ко всей тренировке */
  r.post('/athletes/:userId/comments', requireUser(db), (req, res) => {
    const athleteId = Number(req.params.userId);
    const v = validateComment(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const added = Number.isInteger(athleteId) ? addComment(db, req.user!, athleteId, v.comment) : ({ ok: false, error: 'not_found' } as const);
    if (!added.ok) return void res.status(added.error === 'forbidden' ? 403 : added.error === 'not_found' ? 404 : 400).json({ error: added.error });
    res.status(201).json({ id: added.id });
  });

  return r;
}
