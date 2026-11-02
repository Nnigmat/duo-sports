import { Router } from 'express';
import type { ImportContextResponse } from '../shared/types';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { ImportForbiddenError, applyImport, ensureLibrary, libraryOf, planTitles, redoImport, undoImport, validateCommit, type ActionResult } from './imports';

const STATUS = { not_found: 404, expired: 410, bad_state: 409 } as const;

/** Импорт тренировок: всё только для вошедшего пользователя и только про его данные. */
export function importRouter(db: Db) {
  const r = Router();
  r.use('/import', requireUser(db));
  r.use('/imports', requireUser(db));

  r.get('/import/context', (req, res) => {
    ensureLibrary(db);
    const body: ImportContextResponse = { library: libraryOf(db), mine: planTitles(db, req.user!.id) };
    res.json(body);
  });

  r.post('/imports', (req, res) => {
    const v = validateCommit(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    try {
      res.status(201).json(applyImport(db, req.user!.id, v.commit));
    } catch (e) {
      if (e instanceof ImportForbiddenError) return void res.status(403).json({ error: e.message });
      throw e;
    }
  });

  const action = (run: (userId: number, id: number) => ActionResult) => (req: import('express').Request, res: import('express').Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return void res.status(404).json({ error: 'not_found' });
    const result = run(req.user!.id, id);
    if (!result.ok) return void res.status(STATUS[result.error]).json({ error: result.error });
    res.json(result.record);
  };
  r.post('/imports/:id/undo', action((u, id) => undoImport(db, u, id)));
  r.post('/imports/:id/redo', action((u, id) => redoImport(db, u, id)));

  return r;
}
