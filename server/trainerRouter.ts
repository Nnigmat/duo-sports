import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { addHint, validateHint } from './hints';
import { markReviewed } from './reviews';
import { exerciseCommentsOf, listAthletes, sessionsOf, setGoal, type AthleteFilter } from './trainerAthletes';
import { canAccessAthlete } from './trainerLinks';
import { workoutOf } from './workouts';

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

  const code = (error: 'not_found' | 'forbidden') => (error === 'forbidden' ? 403 : 404);
  const athleteId = (req: Request) => Number(req.params.id);

  /** Запланированное и история выполненных; date — сегодня у клиента */
  r.get('/trainer/athletes/:id/sessions', (req, res) => {
    const date = req.query.date;
    if (!isDate(date)) return void res.status(400).json({ error: 'Ждём date вида 2026-11-03' });
    const id = athleteId(req);
    const result = Number.isInteger(id) ? sessionsOf(db, req.user!, id, date) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) return void res.status(code(result.error)).json({ error: result.error });
    res.json(result.sessions);
  });

  /** Прошлые комментарии тренера по упражнению; exclude — тренировка, которую смотрят сейчас */
  r.get('/trainer/athletes/:id/exercise-comments', (req, res) => {
    const { exercise, exclude } = req.query;
    if (typeof exercise !== 'string' || !exercise.trim()) return void res.status(400).json({ error: 'exercise: название упражнения' });
    const skip = exclude === undefined ? undefined : Number(exclude);
    if (skip !== undefined && !Number.isInteger(skip)) return void res.status(400).json({ error: 'exclude: id тренировки' });
    const id = athleteId(req);
    const result = Number.isInteger(id) ? exerciseCommentsOf(db, req.user!, id, exercise, skip) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) return void res.status(code(result.error)).json({ error: result.error });
    res.json({ comments: result.comments });
  });

  /** Состав запланированной тренировки ученика */
  r.get('/trainer/athletes/:id/workouts/:wid', (req, res) => {
    const id = athleteId(req);
    const wid = Number(req.params.wid);
    if (!Number.isInteger(id) || !Number.isInteger(wid)) return void res.status(404).json({ error: 'not_found' });
    if (!canAccessAthlete(db, req.user!, id)) return void res.status(403).json({ error: 'forbidden' });
    const workout = workoutOf(db, id, wid);
    if (!workout) return void res.status(404).json({ error: 'not_found' });
    res.json(workout);
  });

  /** Подсказка к упражнению ближайшего занятия */
  r.post('/trainer/athletes/:id/hints', (req, res) => {
    const v = validateHint(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const id = athleteId(req);
    const added = Number.isInteger(id) ? addHint(db, req.user!, id, v.hint) : ({ ok: false, error: 'not_found' } as const);
    if (!added.ok) return void res.status(added.error === 'forbidden' ? 403 : added.error === 'not_found' ? 404 : 400).json({ error: added.error });
    res.status(201).json({ id: added.id });
  });

  /** «Отметить тренировку разобранной» */
  r.post('/trainer/sessions/:id/reviewed', (req, res) => {
    const id = Number(req.params.id);
    const result = Number.isInteger(id) ? markReviewed(db, req.user!, id) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) return void res.status(code(result.error)).json({ error: result.error });
    res.status(204).end();
  });

  return r;
}
