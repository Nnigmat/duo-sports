import { Router } from 'express';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import type { ExercisesResponse } from '../shared/types';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { exerciseHistoryOf } from './exerciseHistory';
import { createExercise, deleteExercise, DUPLICATE_ERROR, EXERCISES_WRITE_FORBIDDEN, updateExercise, validateCreate, validateFields } from './exercises';
import { canAddExercises, ensureLibrary, libraryOf } from './imports';

/** Общая библиотека упражнений: читает любой вошедший, меняют тренер и админ. */
export function exercisesRouter(db: Db, demoDir?: string) {
  const r = Router();
  const auth = requireUser(db);
  r.get('/exercises', auth, (_req, res) => {
    ensureLibrary(db);
    const body: ExercisesResponse = { exercises: libraryOf(db) };
    res.json(body);
  });

  /** История выполнения упражнений самого вошедшего: у тренера и админа тоже своя */
  r.get('/exercises/history', auth, (req, res) => {
    ensureLibrary(db);
    res.json(exerciseHistoryOf(db, req.user!.id));
  });

  r.post('/exercises', auth, (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: EXERCISES_WRITE_FORBIDDEN });
    const v = validateCreate(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const result = createExercise(db, v.value);
    if (!result.ok) return void res.status(409).json({ error: DUPLICATE_ERROR });
    res.status(201).json(result.entry);
  });

  r.patch('/exercises/:id', auth, (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: EXERCISES_WRITE_FORBIDDEN });
    const v = validateFields(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const result = updateExercise(db, String(req.params.id), v.value);
    if (!result.ok) {
      return void (result.error === 'duplicate'
        ? res.status(409).json({ error: DUPLICATE_ERROR })
        : res.status(404).json({ error: 'Упражнение не найдено' }));
    }
    res.json(result.entry);
  });

  r.delete('/exercises/:id', auth, async (req, res) => {
    if (!canAddExercises(req.user!.role)) return void res.status(403).json({ error: EXERCISES_WRITE_FORBIDDEN });
    const files = deleteExercise(db, String(req.params.id));
    if (files === null) return void res.status(404).json({ error: 'Упражнение не найдено' });
    if (files === 'in_use') return void res.status(409).json({ error: 'Упражнение стоит в разминке' });
    if (demoDir) await Promise.all(files.map((f) => rm(path.join(demoDir, f), { force: true })));
    res.status(204).end();
  });
  return r;
}
