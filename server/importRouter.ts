import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ImportContextResponse } from '../shared/types';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { listRoutines } from './routines';
import { ImportForbiddenError, ImportInvalidError, applyImport, ensureLibrary, libraryOf, planTitles, redoImport, undoImport, validateCommit, type ActionResult } from './imports';

const STATUS = { not_found: 404, expired: 410, bad_state: 409 } as const;

/** Чьи данные меняет запрос: id пользователя или null, если ответ уже отправлен (нет доступа, кривой адрес) */
export type ImportOwner = (req: Request, res: Response) => number | null;

/**
 * Маршруты импорта под адресом base. У спортсмена это его собственные данные (base пустой),
 * у тренера — данные ученика (/trainer/athletes/:id): доступ проверяет owner.
 */
export function mountImport(r: Router, db: Db, base: string, owner: ImportOwner) {
  r.get(`${base}/import/context`, (req, res) => {
    const id = owner(req, res);
    if (id === null) return;
    ensureLibrary(db);
    const body: ImportContextResponse = {
      library: libraryOf(db),
      routines: listRoutines(db).map(({ id, kind, title }) => ({ id, kind, title })),
      mine: planTitles(db, id),
    };
    res.json(body);
  });

  r.post(`${base}/imports`, (req, res) => {
    const id = owner(req, res);
    if (id === null) return;
    const v = validateCommit(req.body, db);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    try {
      res.status(201).json(applyImport(db, id, v.commit, undefined, req.user!.id));
    } catch (e) {
      if (e instanceof ImportForbiddenError) return void res.status(403).json({ error: e.message });
      if (e instanceof ImportInvalidError) return void res.status(400).json({ error: e.message });
      throw e;
    }
  });

  const action = (run: (userId: number, id: number) => ActionResult) => (req: Request, res: Response) => {
    const userId = owner(req, res);
    if (userId === null) return;
    const id = Number(req.params.importId);
    if (!Number.isInteger(id)) return void res.status(404).json({ error: 'not_found' });
    const result = run(userId, id);
    if (!result.ok) return void res.status(STATUS[result.error]).json({ error: result.error });
    res.json(result.record);
  };
  r.post(`${base}/imports/:importId/undo`, action((u, id) => undoImport(db, u, id)));
  r.post(`${base}/imports/:importId/redo`, action((u, id) => redoImport(db, u, id)));
}

/** Импорт тренировок: всё только для вошедшего пользователя и только про его данные. */
export function importRouter(db: Db) {
  const r = Router();
  r.use('/import', requireUser(db));
  r.use('/imports', requireUser(db));
  mountImport(r, db, '', (req) => req.user!.id);
  return r;
}
