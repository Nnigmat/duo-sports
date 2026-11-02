import { Router } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { todayOf } from './today';

/** «Сегодня»: собирается из плана и выполненных тренировок вошедшего пользователя. */
export function todayRouter(db: Db) {
  const r = Router();
  r.get('/today', requireUser(db), (req, res) => {
    const date = req.query.date;
    if (!isDate(date)) return void res.status(400).json({ error: 'Ждём date вида 2026-11-03' });
    res.json(todayOf(db, req.user!.id, date));
  });
  return r;
}
