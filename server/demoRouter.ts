import { Router } from 'express';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import type { Gender } from '../shared/types';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { EXERCISES_WRITE_FORBIDDEN, setDemo } from './exercises';
import { canAddExercises, libraryOf } from './imports';
import { saveUpload, UUID_FILE } from './videos';

const GENDERS: Gender[] = ['female', 'male'];

/**
 * Ролики чибика к упражнению. PUT/DELETE /exercises/:id/demo/:gender — тренер и админ; GET /demo/:file — любой вошедший.
 * Файлы лежат в dir рядом с видео подходов, но в таблице videos их нет: доступ не привязан к спортсмену.
 */
export function demoRouter({ db, dir, maxBytes }: { db: Db; dir: string; maxBytes: number }): Router {
  const router = Router();
  const auth = requireUser(db);
  const entryOf = (slug: string) => libraryOf(db).find((e) => e.id === slug);
  const removeFile = (file: string | undefined) => (file ? rm(path.join(dir, file), { force: true }) : Promise.resolve());

  router.get('/demo/:file', auth, (req, res) => {
    const file = String(req.params.file);
    if (!UUID_FILE.test(file)) return void res.status(404).json({ error: 'not_found' });
    res.sendFile(path.resolve(dir, file), { headers: { 'Cache-Control': 'private, max-age=3600' } }, (err) => {
      if (!err || res.headersSent) return;
      res.removeHeader('Cache-Control');
      const status = (err as { status?: number }).status === 416 ? 416 : 404;
      res.status(status).json({ error: status === 416 ? 'range_not_satisfiable' : 'not_found' });
    });
  });

  router.put('/exercises/:id/demo/:gender', auth, async (req, res, next) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: EXERCISES_WRITE_FORBIDDEN });
    const slug = String(req.params.id);
    const gender = String(req.params.gender) as Gender;
    if (!GENDERS.includes(gender)) return void res.status(400).json({ error: 'gender: female или male' });
    if (!entryOf(slug)) return void res.status(404).json({ error: 'Упражнение не найдено' });

    const saved = await saveUpload(req, dir, maxBytes).catch(next);
    if (!saved) return;
    if (!saved.ok) {
      if (saved.status === 413) res.set('Connection', 'close');
      return void res.status(saved.status).json({ error: saved.error });
    }
    const set = setDemo(db, slug, gender, saved.file);
    if (!set.ok) {
      await removeFile(saved.file); // упражнение удалили, пока шла загрузка
      return void res.status(404).json({ error: 'Упражнение не найдено' });
    }
    await removeFile(set.previous);
    res.json(entryOf(slug));
  });

  router.delete('/exercises/:id/demo/:gender', auth, async (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: EXERCISES_WRITE_FORBIDDEN });
    const slug = String(req.params.id);
    const gender = String(req.params.gender) as Gender;
    if (!GENDERS.includes(gender)) return void res.status(400).json({ error: 'gender: female или male' });
    const set = setDemo(db, slug, gender, null);
    if (!set.ok) return void res.status(404).json({ error: 'Упражнение не найдено' });
    await removeFile(set.previous);
    res.json(entryOf(slug));
  });

  return router;
}
