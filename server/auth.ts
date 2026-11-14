import { createHash, randomBytes } from 'node:crypto';
import { DEFAULT_SOUND_STYLE, DEFAULT_SOUND_VOLUME, DEFAULT_START_DELAY_SEC, DISPLAY_NAME_MAX, isSoundStyle, isSoundVolume, MAX_SOUND_VOLUME, MAX_START_DELAY_SEC, type AuthUser, type Gender, type Role, type SoundStyle } from '../shared/types';
import type { Db } from './db';
import { hashPassword, verifyPassword } from './password';

export const SESSION_DAYS = 30;
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

type Clock = () => Date;
const now: Clock = () => new Date();
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

type UserRow = { id: number; email: string; password_hash: string; role: Role; password_changed_at: string | null; gender: Gender | null; display_name: string | null; start_delay_sec: number | null; sound_style: string | null; sound_volume: number | null; speak_names: number | null };
const toUser = (r: UserRow): AuthUser => ({
  id: r.id,
  email: r.email,
  role: r.role,
  passwordChangedAt: r.password_changed_at,
  ...(r.gender ? { gender: r.gender } : {}),
  ...(r.display_name ? { displayName: r.display_name } : {}),
  startDelaySec: r.start_delay_sec ?? DEFAULT_START_DELAY_SEC,
  soundStyle: isSoundStyle(r.sound_style) ? r.sound_style : DEFAULT_SOUND_STYLE,
  soundVolume: r.sound_volume ?? DEFAULT_SOUND_VOLUME,
  speakNames: r.speak_names === 1,
});

const isGender = (v: unknown): v is Gender => v === 'female' || v === 'male';

export async function createUser(db: Db, email: string, password: string, role: Role, clock: Clock = now, gender?: Gender) {
  if (gender !== undefined && !isGender(gender)) throw new Error('gender: female или male');
  const hash = await hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, role, gender, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(email.trim(), hash, role, gender ?? null, clock().toISOString());
  return Number(info.lastInsertRowid);
}

/** Пол спортсмена выбирает ролик чибика; null очищает. false — такого email нет. */
export function setGender(db: Db, email: string, gender: Gender | null): boolean {
  if (gender !== null && !isGender(gender)) throw new Error('gender: female, male или null');
  return db.prepare('UPDATE users SET gender = ? WHERE email = ?').run(gender, email.trim()).changes === 1;
}

/** Отсчёт перед записью видео, с. Бросает, если не целое от 0 до MAX_START_DELAY_SEC. */
export function setStartDelay(db: Db, userId: number, sec: number): boolean {
  if (!Number.isInteger(sec) || sec < 0 || sec > MAX_START_DELAY_SEC) throw new Error(`startDelaySec: целое от 0 до ${MAX_START_DELAY_SEC}`);
  return db.prepare('UPDATE users SET start_delay_sec = ? WHERE id = ?').run(sec, userId).changes === 1;
}

/** Стиль и громкость сигналов. Бросает, если стиль неизвестен или громкость не целое от 0 до MAX_SOUND_VOLUME. */
export function setSound(db: Db, userId: number, style: SoundStyle, volume: number): boolean {
  if (!isSoundStyle(style)) throw new Error('soundStyle: classic, bell или soft');
  if (!isSoundVolume(volume)) throw new Error(`soundVolume: целое от 0 до ${MAX_SOUND_VOLUME}`);
  return db.prepare('UPDATE users SET sound_style = ?, sound_volume = ? WHERE id = ?').run(style, volume, userId).changes === 1;
}

/** Озвучивать названия упражнений в разминке и заминке. */
export function setSpeakNames(db: Db, userId: number, on: boolean): boolean {
  if (typeof on !== 'boolean') throw new Error('speakNames: true или false');
  return db.prepare('UPDATE users SET speak_names = ? WHERE id = ?').run(on ? 1 : 0, userId).changes === 1;
}

/** Имя для показа: пробелы по краям убираются, пустое очищает. Бросает, если длиннее DISPLAY_NAME_MAX. */
export function setDisplayName(db: Db, userId: number, name: string): boolean {
  const value = name.trim();
  if (value.length > DISPLAY_NAME_MAX) throw new Error(`displayName: не длиннее ${DISPLAY_NAME_MAX} символов`);
  return db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(value || null, userId).changes === 1;
}

function newSession(db: Db, userId: number, clock: Clock): string {
  const token = randomBytes(32).toString('base64url');
  const created = clock();
  const expires = new Date(created.getTime() + SESSION_DAYS * 86_400_000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    created.toISOString(),
    expires.toISOString(),
  );
  return token;
}

export type LoginResult =
  | { ok: true; token: string; user: AuthUser }
  | { ok: false; error: 'wrong_credentials' }
  | { ok: false; error: 'locked'; retryAfterSec: number };

/** Пять неудачных попыток подряд на email за 15 минут закрывают вход на оставшееся время. */
export async function login(db: Db, email: string, password: string, clock: Clock = now): Promise<LoginResult> {
  const t = clock();
  const since = new Date(t.getTime() - LOCK_MINUTES * 60_000).toISOString();
  const recent = db
    .prepare('SELECT at FROM login_attempts WHERE email = ? AND at > ? ORDER BY at')
    .all(email.trim(), since) as { at: string }[];
  if (recent.length >= MAX_ATTEMPTS) {
    const unlock = new Date(recent[recent.length - MAX_ATTEMPTS]!.at).getTime() + LOCK_MINUTES * 60_000;
    return { ok: false, error: 'locked', retryAfterSec: Math.max(1, Math.ceil((unlock - t.getTime()) / 1000)) };
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as UserRow | undefined;
  // Хеш считаем и для несуществующего email, чтобы время ответа не выдавало, есть ли такой аккаунт
  let valid = false;
  if (row) valid = await verifyPassword(password, row.password_hash);
  else await hashPassword(password);
  if (!row || !valid) {
    db.prepare('INSERT INTO login_attempts (email, at) VALUES (?, ?)').run(email.trim(), t.toISOString());
    return { ok: false, error: 'wrong_credentials' };
  }
  db.prepare('DELETE FROM login_attempts WHERE email = ?').run(email.trim());
  return { ok: true, token: newSession(db, row.id, clock), user: toUser(row) };
}

export function userBySession(db: Db, token: string, clock: Clock = now): AuthUser | null {
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), clock().toISOString()) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function logout(db: Db, token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export type ChangeResult = { ok: true; token: string } | { ok: false; error: 'wrong_current' | 'weak' };

/** Меняет пароль; текущую сессию заменяет новой, остальные закрывает, если logoutOthers. */
export async function changePassword(
  db: Db,
  userId: number,
  current: string,
  next: string,
  logoutOthers: boolean,
  clock: Clock = now,
): Promise<ChangeResult> {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  if (!row || !(await verifyPassword(current, row.password_hash))) return { ok: false, error: 'wrong_current' };
  if (!passwordAcceptable(next, current)) return { ok: false, error: 'weak' };
  const hash = await hashPassword(next);
  db.prepare('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?').run(
    hash,
    clock().toISOString(),
    userId,
  );
  if (logoutOthers) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return { ok: true, token: logoutOthers ? newSession(db, userId, clock) : '' };
}

/** Те же правила, что подсказывает экран: от 8 символов, буквы и цифры, не как текущий. */
export function passwordAcceptable(next: string, current: string): boolean {
  return next.length >= 8 && /[A-Za-zА-Яа-яЁё]/.test(next) && /\d/.test(next) && next !== current;
}
