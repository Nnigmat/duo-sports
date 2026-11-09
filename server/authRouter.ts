import { Router, type Request, type Response, type NextFunction } from 'express';
import { DISPLAY_NAME_MAX, MAX_START_DELAY_SEC, type AuthUser } from '../shared/types';
import { changePassword, login, logout, setDisplayName, setGender, setStartDelay, SESSION_DAYS, userBySession } from './auth';
import type { Db } from './db';

const COOKIE = 'session';

function tokenOf(req: Request): string | null {
  const m = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie ?? '');
  return m ? decodeURIComponent(m[1]!) : null;
}

function setCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 86_400_000,
    path: '/',
  });
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/** Подставляет req.user по cookie; без сессии отвечает 401. */
export const requireUser = (db: Db) => (req: Request, res: Response, next: NextFunction) => {
  const token = tokenOf(req);
  const user = token ? userBySession(db, token) : null;
  if (!user) return void res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function authRouter(db: Db) {
  const r = Router();

  r.post('/auth/login', async (req, res) => {
    const result = await login(db, str(req.body?.email), str(req.body?.password));
    if (!result.ok) {
      if (result.error === 'locked') {
        res.set('Retry-After', String(result.retryAfterSec));
        return void res.status(429).json(result);
      }
      return void res.status(401).json(result);
    }
    setCookie(res, result.token);
    res.json(result.user);
  });

  r.post('/auth/logout', (req, res) => {
    const token = tokenOf(req);
    if (token) logout(db, token);
    res.clearCookie(COOKIE, { path: '/' });
    res.status(204).end();
  });

  r.get('/auth/me', requireUser(db), (req, res) => {
    res.json(req.user);
  });

  r.post('/auth/change-password', requireUser(db), async (req, res) => {
    const result = await changePassword(
      db,
      req.user!.id,
      str(req.body?.current),
      str(req.body?.next),
      req.body?.logoutOthers !== false,
    );
    if (!result.ok) return void res.status(result.error === 'weak' ? 400 : 403).json(result);
    if (result.token) setCookie(res, result.token);
    res.json({ ok: true });
  });

  r.put('/auth/gender', requireUser(db), (req, res) => {
    const gender = req.body?.gender;
    if (gender !== 'female' && gender !== 'male') return void res.status(400).json({ error: 'gender: female или male' });
    setGender(db, req.user!.email, gender);
    res.json({ ok: true });
  });

  r.put('/auth/start-delay', requireUser(db), (req, res) => {
    const sec = req.body?.startDelaySec;
    if (!Number.isInteger(sec) || sec < 0 || sec > MAX_START_DELAY_SEC)
      return void res.status(400).json({ error: `startDelaySec: целое от 0 до ${MAX_START_DELAY_SEC}` });
    setStartDelay(db, req.user!.id, sec);
    res.json({ ok: true });
  });

  r.put('/auth/display-name', requireUser(db), (req, res) => {
    const name = req.body?.displayName;
    if (typeof name !== 'string') return void res.status(400).json({ error: 'displayName: строка' });
    if (name.trim().length > DISPLAY_NAME_MAX)
      return void res.status(400).json({ error: `displayName: не длиннее ${DISPLAY_NAME_MAX} символов` });
    setDisplayName(db, req.user!.id, name);
    res.json({ ok: true });
  });

  return r;
}
