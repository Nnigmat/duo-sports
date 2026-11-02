import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { listAthletes, setGoal, type AthleteFilter } from './trainerAthletes';

const FILTERS: AthleteFilter[] = ['all', 'review', 'inactive', 'ok'];

/** Кабинет тренера: только trainer и admin; к чужим ученикам доступа нет (проверяют функции модулей) */
export function trainerRouter(db: Db) {
  const r = Router();
  r.use('/trainer', requireUser(db), (req: Request, res: Response, next: NextFunction) => {
    if (req.user!.role === 'athlete') return void res.status(403).json({ error: 'forbidden' });
    next();
  });

  /** today — сегодня у клиента; filter: all | review | inactive | ok; q — поиск по имени и почте */
  r.get('/trainer/athletes', (req, res) => {
    const { date, filter, q } = req.query;
    if (!isDate(date)) return void res.status(400).json({ error: 'Ждём date вида 2026-11-03' });
    if (filter !== undefined && !FILTERS.includes(filter as AthleteFilter)) return void res.status(400).json({ error: 'filter: all, review, inactive или ok' });
    const result = listAthletes(db, req.user!, { today: date, filter: filter as AthleteFilter | undefined, q: typeof q === 'string' ? q : undefined });
    if (!result.ok) return void res.status(403).json({ error: result.error });
    res.json(result.list);
  });

  r.put('/trainer/athletes/:id/goal', (req, res) => {
    const id = Number(req.params.id);
    const goal = req.body?.goal;
    if (typeof goal !== 'string') return void res.status(400).json({ error: 'goal: строка' });
    const result = Number.isInteger(id) ? setGoal(db, req.user!, id, goal) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) return void res.status(result.error === 'forbidden' ? 403 : result.error === 'too_long' ? 400 : 404).json({ error: result.error });
    res.status(204).end();
  });

  return r;
}
