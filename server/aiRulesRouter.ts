import { Router, type NextFunction, type Request, type Response } from 'express';
import { AI_RULES_MAX, getAiRules, setAiRules } from './aiRules';
import { requireUser } from './authRouter';
import type { Db } from './db';

const FORBIDDEN = 'Правила меняет админ';

const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role !== 'admin') return void res.status(403).json({ error: FORBIDDEN });
  next();
};

/** Правила агента, собирающего тренировки: читает и меняет только админ. */
export function aiRulesRouter(db: Db) {
  const r = Router();
  const auth = requireUser(db);

  r.get('/admin/ai-rules', auth, adminOnly, (_req, res) => {
    res.json(getAiRules(db));
  });

  r.put('/admin/ai-rules', auth, adminOnly, (req, res) => {
    const text = (req.body as { text?: unknown } | undefined)?.text;
    if (typeof text !== 'string' || text.length > AI_RULES_MAX) {
      return void res.status(400).json({ error: `text: строка до ${AI_RULES_MAX} символов` });
    }
    res.json(setAiRules(db, req.user!.id, text));
  });
  return r;
}
