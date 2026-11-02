import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { canAccessAthlete } from './trainerLinks';

const EXTENSIONS: Record<string, string> = {
  'video/webm': 'webm',
  'video/mp4': 'mp4',
};

class TooLarge extends Error {}

/** `video/webm;codecs=vp9,opus` → `webm`; чужой или пустой тип → undefined */
function extensionFor(contentType: string | undefined): string | undefined {
  const mime = contentType?.split(';')[0].trim().toLowerCase();
  return mime ? EXTENSIONS[mime] : undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_VIDEO_SEC = 3600;

/**
 * POST /videos: тело запроса — сам видеофайл, ?durationSec= — его длительность. Пишем потоком на диск
 * (в память не буферизуем), в базе остаётся владелец и путь. GET /videos/:id отдаёт файл (с Range)
 * самому спортсмену, его тренеру и админу.
 */
export function videosRouter({ db, dir, maxBytes }: { db: Db; dir: string; maxBytes: number }): Router {
  const router = Router();
  router.use('/videos', requireUser(db));

  router.get('/videos/:id', (req, res) => {
    const id = String(req.params.id);
    const row = UUID.test(id) ? (db.prepare('SELECT athlete_id, file FROM videos WHERE id = ?').get(id) as { athlete_id: number; file: string } | undefined) : undefined;
    if (!row || !canAccessAthlete(db, req.user!, row.athlete_id)) return void res.status(404).json({ error: 'not_found' });
    // Заголовок кеша уходит только с удачным ответом: ошибку браузер не должен запоминать на час
    res.sendFile(path.resolve(dir, row.file), { headers: { 'Cache-Control': 'private, max-age=3600' } }, (err) => {
      if (!err || res.headersSent) return;
      res.removeHeader('Cache-Control'); // библиотека ставит заголовки до разбора Range
      // Range за пределами файла: 416, пропавший файл: 404
      const status = (err as { status?: number }).status === 416 ? 416 : 404;
      res.status(status).json({ error: status === 416 ? 'range_not_satisfiable' : 'not_found' });
    });
  });

  router.post('/videos', async (req, res, next) => {
    const rawDuration = req.query.durationSec;
    const durationSec = rawDuration === undefined ? 0 : Number(rawDuration);
    if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > MAX_VIDEO_SEC) {
      res.status(400).json({ error: 'durationSec: секунды от 0 до 3600' });
      return;
    }
    const ext = extensionFor(req.headers['content-type']);
    if (!ext) {
      res.status(415).json({ error: 'Неподдерживаемый формат видео' });
      return;
    }

    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const file = path.join(dir, `${id}.${ext}`);
    let size = 0;
    const limit = new Transform({
      transform(chunk: Buffer, _enc, done) {
        size += chunk.length;
        if (size > maxBytes) done(new TooLarge());
        else done(null, chunk);
      },
    });

    try {
      await pipeline(req, limit, createWriteStream(file));
    } catch (err) {
      await rm(file, { force: true });
      if (err instanceof TooLarge) {
        res.set('Connection', 'close').status(413).json({ error: 'Видео слишком большое' });
      } else {
        next(err);
      }
      return;
    }

    if (size === 0) {
      await rm(file, { force: true });
      res.status(400).json({ error: 'Пустое видео' });
      return;
    }
    db.prepare('INSERT INTO videos (id, athlete_id, file, duration_sec, created_at) VALUES (?, ?, ?, ?, ?)').run(id, req.user!.id, `${id}.${ext}`, durationSec, new Date().toISOString());
    res.status(201).json({ id, path: `videos/${id}.${ext}` });
  });

  return router;
}
