import { Router } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { measurementsOf, saveMeasurement } from './measurements';

/** «Замеры»: каждый читает и пишет только свои; тренер читает чужие в trainerRouter. */
export function measurementsRouter(db: Db) {
  const r = Router();

  r.get('/measurements', requireUser(db), (req, res) => {
    res.json(measurementsOf(db, req.user!.id));
  });

  r.post('/measurements', requireUser(db), (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const result = saveMeasurement(db, req.user!.id, req.body, today);
    if (!result.ok) return void res.status(400).json({ error: result.error });
    res.status(204).end();
  });

  return r;
}
