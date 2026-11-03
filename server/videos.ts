import { Router, type Request } from 'express';
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

export type SaveUpload = { ok: true; file: string; size: number } | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * Пишет тело запроса потоком в dir/<uuid>.<ext> (в память не буферизуем). Расширение берётся из Content-Type;
 * при любой ошибке недописанный файл удаляется. Ошибки чтения потока (обрыв) пробрасываются.
 */
export async function saveUpload(req: Request, dir: string, maxBytes: number): Promise<SaveUpload> {
  const ext = extensionFor(req.headers['content-type']);
  if (!ext) return { ok: false, status: 415, error: 'Неподдерживаемый формат видео' };
  await mkdir(dir, { recursive: true });
  const file = `${randomUUID()}.${ext}`;
  const target = path.join(dir, file);
  let size = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, done) {
      size += chunk.length;
      if (size > maxBytes) done(new TooLarge());
      else done(null, chunk);
    },
  });
  try {
    await pipeline(req, limit, createWriteStream(target));
  } catch (err) {
    await rm(target, { force: true });
    if (err instanceof TooLarge) return { ok: false, status: 413, error: 'Видео слишком большое' };
    throw err;
  }
  if (size === 0) {
    await rm(target, { force: true });
    return { ok: false, status: 400, error: 'Пустое видео' };
  }
  return { ok: true, file, size };
}

export const UUID_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:mp4|webm)$/;

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
    const saved = await saveUpload(req, dir, maxBytes).catch(next);
    if (!saved) return;
    if (!saved.ok) {
      if (saved.status === 413) res.set('Connection', 'close');
      res.status(saved.status).json({ error: saved.error });
      return;
    }
    const { file } = saved;
    const id = file.slice(0, file.lastIndexOf('.'));
    db.prepare('INSERT INTO videos (id, athlete_id, file, duration_sec, created_at) VALUES (?, ?, ?, ?, ?)').run(id, req.user!.id, file, durationSec, new Date().toISOString());
    res.status(201).json({ id, path: `videos/${file}` });
  });

  return router;
}
