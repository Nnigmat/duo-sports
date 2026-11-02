import { Router } from 'express';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { isDate } from './imports';
import { dismissNotification, markNotificationRead } from './notifications';
import { sessionReviewOf, videoReviewOf } from './sessionReview';

const status = (error: 'not_found' | 'forbidden') => (error === 'forbidden' ? 403 : 404);

/** Разбор тренировок: общий для спортсмена и тренера, права решает canAccessAthlete */
export function reviewRouter(db: Db) {
  const r = Router();
  r.use(['/sessions', '/notifications'], requireUser(db));

  /** date — сегодня у клиента (для подсказок к следующему занятию) */
  r.get('/sessions/:id/review', (req, res) => {
    const id = Number(req.params.id);
    const date = req.query.date;
    if (!isDate(date)) return void res.status(400).json({ error: 'Ждём date вида 2026-11-03' });
    const result = Number.isInteger(id) ? sessionReviewOf(db, req.user!, id, date) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) return void res.status(status(result.error)).json({ error: result.error });
    res.json(result.review);
  });

  r.get('/sessions/video/:videoId', (req, res) => {
    const result = videoReviewOf(db, req.user!, String(req.params.videoId));
    if (!result.ok) return void res.status(status(result.error)).json({ error: result.error });
    res.json(result.review);
  });

  const act = (fn: typeof markNotificationRead) => (req: import('express').Request, res: import('express').Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !fn(db, req.user!.id, id)) return void res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  };
  r.post('/notifications/:id/read', act(markNotificationRead));
  r.post('/notifications/:id/dismiss', act(dismissNotification));

  return r;
}
