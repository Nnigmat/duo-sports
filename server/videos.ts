import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

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

/**
 * POST /videos: тело запроса — сам видеофайл. Пишем потоком на диск (в память не буферизуем),
 * в базу позже попадёт только путь из ответа. Авторизации пока нет: добавим вместе с сессиями.
 */
export function videosRouter({ dir, maxBytes }: { dir: string; maxBytes: number }): Router {
  const router = Router();

  router.post('/videos', async (req, res, next) => {
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
    res.status(201).json({ id, path: `videos/${id}.${ext}` });
  });

  return router;
}
