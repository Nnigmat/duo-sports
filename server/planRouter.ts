import { Router } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { clearDay, planOf, setDay } from './plan';

/** План: всё только для вошедшего пользователя и про его данные. */
export function planRouter(db: Db) {
  const r = Router();
  r.use('/plan', requireUser(db));

  r.get('/plan', (req, res) => {
    res.json(planOf(db, req.user!.id));
  });

  r.put('/plan/entries/:date', (req, res) => {
    const workoutId = Number(req.body?.workoutId);
    if (!isDate(req.params.date) || !Number.isInteger(workoutId)) return void res.status(400).json({ error: 'Ждём дату в адресе и workoutId в теле' });
    const result = setDay(db, req.user!.id, req.params.date, workoutId);
    if (!result.ok) return void res.status(404).json({ error: result.error });
    res.status(204).end();
  });

  r.delete('/plan/entries/:date', (req, res) => {
    if (!isDate(req.params.date)) return void res.status(400).json({ error: 'Ждём дату вида 2026-11-03' });
    clearDay(db, req.user!.id, req.params.date);
    res.status(204).end();
  });

  return r;
}
