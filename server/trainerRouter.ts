import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { mountImport } from './importRouter';
import { MAX_PAUSE_DAYS, moveEntry, pausePlan, scheduleOf, skipEntry } from './schedule';
import { addHint, validateHint } from './hints';
import { clearDay, copyWorkoutToAthlete, planOf, setDay } from './plan';
import { markReviewed } from './reviews';
import { exerciseCommentsOf, listAthletes, progressOf, sessionsOf, setGoal, type AthleteFilter } from './trainerAthletes';
import { measurementsOf } from './measurements';
import { canAccessAthlete } from './trainerLinks';
import { workoutOf, workoutResponse } from './workouts';
import { updateWorkout } from './workoutEdit';

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

  r.get('/trainer/athletes/:id/progress', (req, res) => {
    const date = req.query.date;
    if (!isDate(date)) return void res.status(400).json({ error: 'Ждём date вида 2026-11-03' });
    const id = athleteId(req);
    const result = Number.isInteger(id) ? progressOf(db, req.user!, id, date) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) return void res.status(code(result.error)).json({ error: result.error });
    res.json(result.progress);
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

  /** Замеры ученика: только чтение, писать за ученика нельзя */
  r.get('/trainer/athletes/:id/measurements', (req, res) => {
    const id = athleteId(req);
    if (!Number.isInteger(id)) return void res.status(404).json({ error: 'not_found' });
    if (!canAccessAthlete(db, req.user!, id)) return void res.status(403).json({ error: 'forbidden' });
    res.json(measurementsOf(db, id));
  });

  /** План ученика целиком и правки по дням: те же данные и действия, что у самого спортсмена на /plan */
  r.get('/trainer/athletes/:id/plan', (req, res) => {
    const id = athleteId(req);
    if (!Number.isInteger(id)) return void res.status(404).json({ error: 'not_found' });
    if (!canAccessAthlete(db, req.user!, id)) return void res.status(403).json({ error: 'forbidden' });
    res.json(planOf(db, id));
  });

  r.put('/trainer/athletes/:id/plan/entries/:date', (req, res) => {
    const id = athleteId(req);
    const workoutId = Number(req.body?.workoutId);
    if (!Number.isInteger(id)) return void res.status(404).json({ error: 'not_found' });
    if (!canAccessAthlete(db, req.user!, id)) return void res.status(403).json({ error: 'forbidden' });
    if (!isDate(req.params.date) || !Number.isInteger(workoutId)) return void res.status(400).json({ error: 'Ждём дату в адресе и workoutId в теле' });
    const result = setDay(db, id, req.params.date, workoutId);
    if (!result.ok) return void res.status(404).json({ error: result.error });
    res.status(204).end();
  });

  /** Копия тренировки ученика другому ученику тренера на дату; доступ нужен к обоим */
  r.post('/trainer/athletes/:id/plan/copy', (req, res) => {
    const id = athleteId(req);
    const { workoutId, toAthleteId, date } = req.body ?? {};
    if (!Number.isInteger(id) || !Number.isInteger(toAthleteId)) return void res.status(404).json({ error: 'not_found' });
    if (!canAccessAthlete(db, req.user!, id) || !canAccessAthlete(db, req.user!, toAthleteId)) return void res.status(403).json({ error: 'forbidden' });
    if (!isDate(date) || !Number.isInteger(workoutId)) return void res.status(400).json({ error: 'Ждём workoutId, toAthleteId и date вида 2026-11-03' });
    const result = copyWorkoutToAthlete(db, id, workoutId, toAthleteId, date);
    if (!result.ok) return void res.status(404).json({ error: result.error });
    res.status(204).end();
  });

  r.delete('/trainer/athletes/:id/plan/entries/:date', (req, res) => {
    const id = athleteId(req);
    if (!Number.isInteger(id)) return void res.status(404).json({ error: 'not_found' });
    if (!canAccessAthlete(db, req.user!, id)) return void res.status(403).json({ error: 'forbidden' });
    if (!isDate(req.params.date)) return void res.status(400).json({ error: 'Ждём дату вида 2026-11-03' });
    clearDay(db, id, req.params.date);
    res.status(204).end();
  });

  /** Ученик из адреса, если он доступен тренеру; иначе отвечает 404 или 403 и возвращает null */
  const accessible = (req: Request, res: Response): number | null => {
    const id = athleteId(req);
    if (!Number.isInteger(id)) {
      res.status(404).json({ error: 'not_found' });
      return null;
    }
    if (!canAccessAthlete(db, req.user!, id)) {
      res.status(403).json({ error: 'forbidden' });
      return null;
    }
    return id;
  };

  /** Импорт и создание тренировок для ученика: тот же поток, что у спортсмена, но данные пишутся ему */
  mountImport(r, db, '/trainer/athletes/:id', accessible);

  /** Перенос и пропуск тренировки ученика: те же панели, что у спортсмена */
  r.get('/trainer/athletes/:id/schedule', (req, res) => {
    const id = accessible(req, res);
    if (id === null) return;
    const { date, from } = req.query;
    if (!isDate(date) || (from !== undefined && !isDate(from))) return void res.status(400).json({ error: 'Ждём date (и from) вида 2026-11-03' });
    const data = scheduleOf(db, id, date, (from as string | undefined) ?? date);
    if (!data) return void res.status(404).json({ error: 'not_found' });
    res.json(data);
  });

  r.post('/trainer/athletes/:id/schedule/move', (req, res) => {
    const id = accessible(req, res);
    if (id === null) return;
    const { today, from, to } = req.body ?? {};
    if (!isDate(today) || !isDate(from) || !isDate(to)) return void res.status(400).json({ error: 'Ждём today, from и to вида 2026-11-03' });
    const result = moveEntry(db, id, today, from, to);
    if (!result.ok) return void res.status(result.error === 'not_found' ? 404 : 400).json({ error: result.error });
    res.status(204).end();
  });

  r.post('/trainer/athletes/:id/schedule/skip', (req, res) => {
    const id = accessible(req, res);
    if (id === null) return;
    const { from } = req.body ?? {};
    if (!isDate(from)) return void res.status(400).json({ error: 'Ждём from вида 2026-11-03' });
    const result = skipEntry(db, id, from);
    if (!result.ok) return void res.status(404).json({ error: result.error });
    res.status(204).end();
  });

  r.post('/trainer/athletes/:id/schedule/pause', (req, res) => {
    const id = accessible(req, res);
    if (id === null) return;
    const { from, to } = req.body ?? {};
    if (!isDate(from) || !isDate(to)) return void res.status(400).json({ error: 'Ждём from и to вида 2026-11-03' });
    if (!pausePlan(db, id, from, to).ok) return void res.status(400).json({ error: `Пауза от 1 до ${MAX_PAUSE_DAYS} дней` });
    res.status(204).end();
  });

  /** Тренировка ученика для запуска в превью: с комментариями и техникой, но без пометки «прочитано» */
  r.get('/trainer/athletes/:id/workouts/:wid/preview', (req, res) => {
    const id = accessible(req, res);
    if (id === null) return;
    const wid = Number(req.params.wid);
    const data = Number.isInteger(wid) ? workoutResponse(db, id, wid, false) : null;
    if (!data) return void res.status(404).json({ error: 'not_found' });
    res.json(data);
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

  /** Тренер меняет состав тренировки ученика: название и блоки целиком */
  r.put('/trainer/athletes/:id/workouts/:wid', (req, res) => {
    const id = athleteId(req);
    const wid = Number(req.params.wid);
    if (!Number.isInteger(id) || !Number.isInteger(wid)) return void res.status(404).json({ error: 'not_found' });
    const result = updateWorkout(db, req.user!, id, wid, req.body);
    if (!result.ok) return void res.status(result.error === 'forbidden' ? 403 : result.error === 'not_found' ? 404 : 400).json({ error: result.error });
    res.json(result.workout);
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
