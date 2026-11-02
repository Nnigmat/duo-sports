import { Router } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { moveEntry, scheduleOf, MAX_PAUSE_DAYS, pausePlan, resumePlan, skipEntry, unskipEntry } from './schedule';

/** Перенос тренировки: варианты считаются из плана вошедшего пользователя. */
export function scheduleRouter(db: Db) {
  const r = Router();
  r.use('/schedule', requireUser(db));

  /** date — сегодня у клиента; from — день тренировки (по умолчанию сегодня) */
  r.get('/schedule', (req, res) => {
    const { date, from } = req.query;
    if (!isDate(date) || (from !== undefined && !isDate(from))) return void res.status(400).json({ error: 'Ждём date (и from) вида 2026-11-03' });
    const data = scheduleOf(db, req.user!.id, date, (from as string | undefined) ?? date);
    if (!data) return void res.status(404).json({ error: 'not_found' });
    res.json(data);
  });

  r.post('/schedule/move', (req, res) => {
    const { today, from, to } = req.body ?? {};
    if (!isDate(today) || !isDate(from) || !isDate(to)) return void res.status(400).json({ error: 'Ждём today, from и to вида 2026-11-03' });
    const result = moveEntry(db, req.user!.id, today, from, to);
    if (!result.ok) return void res.status(result.error === 'not_found' ? 404 : 400).json({ error: result.error });
    res.status(204).end();
  });

  /** Пропустить тренировку дня from */
  r.post('/schedule/skip', (req, res) => {
    const { from } = req.body ?? {};
    if (!isDate(from)) return void res.status(400).json({ error: 'Ждём from вида 2026-11-03' });
    const result = skipEntry(db, req.user!.id, from);
    if (!result.ok) return void res.status(404).json({ error: result.error });
    res.status(204).end();
  });

  /** Вернуть пропущенную тренировку дня from в план */
  r.delete('/schedule/skip', (req, res) => {
    const { from } = req.query;
    if (!isDate(from)) return void res.status(400).json({ error: 'Ждём from вида 2026-11-03' });
    const result = unskipEntry(db, req.user!.id, from);
    if (!result.ok) return void res.status(404).json({ error: result.error });
    res.status(204).end();
  });

  /** Поставить план на паузу с from по to включительно */
  r.post('/schedule/pause', (req, res) => {
    const { from, to } = req.body ?? {};
    if (!isDate(from) || !isDate(to)) return void res.status(400).json({ error: 'Ждём from и to вида 2026-11-03' });
    const result = pausePlan(db, req.user!.id, from, to);
    if (!result.ok) return void res.status(400).json({ error: `Пауза от 1 до ${MAX_PAUSE_DAYS} дней` });
    res.status(204).end();
  });

  /** Возобновить план с дня date */
  r.delete('/schedule/pause', (req, res) => {
    const { date } = req.query;
    if (!isDate(date)) return void res.status(400).json({ error: 'Ждём date вида 2026-11-03' });
    if (!resumePlan(db, req.user!.id, date)) return void res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  });

  return r;
}
