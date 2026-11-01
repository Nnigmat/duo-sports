import { beforeEach, describe, expect, it } from 'vitest';
import { changePassword, createUser, login, logout, userBySession, MAX_ATTEMPTS } from './auth';
import { openDb, type Db } from './db';
import { hashPassword, verifyPassword } from './password';

let db: Db;
let t = new Date('2026-11-01T10:00:00Z');
const clock = () => t;
const at = (min: number) => (t = new Date(new Date('2026-11-01T10:00:00Z').getTime() + min * 60_000));

beforeEach(async () => {
  db = openDb(':memory:');
  at(0);
  await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete', clock);
});

describe('password', () => {
  it('хеш проверяется, чужой пароль нет', async () => {
    const h = await hashPassword('abc12345');
    expect(await verifyPassword('abc12345', h)).toBe(true);
    expect(await verifyPassword('abc12346', h)).toBe(false);
    expect(await verifyPassword('x', 'мусор')).toBe(false);
  });
});

describe('login', () => {
  it('верный пароль даёт сессию, email без учёта регистра', async () => {
    const r = await login(db, 'Nikita@Example.com', 'trenirovka7', clock);
    expect(r.ok).toBe(true);
    if (r.ok) expect(userBySession(db, r.token, clock)?.role).toBe('athlete');
  });
  it('неверный пароль и неизвестный email — одна и та же ошибка', async () => {
    expect(await login(db, 'nikita@example.com', 'нет', clock)).toEqual({ ok: false, error: 'wrong_credentials' });
    expect(await login(db, 'nobody@example.com', 'нет', clock)).toEqual({ ok: false, error: 'wrong_credentials' });
  });
  it('после 5 неудач вход закрыт на 15 минут, потом открывается', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) await login(db, 'nikita@example.com', 'нет', clock);
    const locked = await login(db, 'nikita@example.com', 'trenirovka7', clock);
    expect(locked).toEqual({ ok: false, error: 'locked', retryAfterSec: 900 });
    at(16);
    expect((await login(db, 'nikita@example.com', 'trenirovka7', clock)).ok).toBe(true);
  });
  it('сессия истекает через 30 дней и закрывается выходом', async () => {
    const r = await login(db, 'nikita@example.com', 'trenirovka7', clock);
    if (!r.ok) throw new Error();
    at(31 * 24 * 60);
    expect(userBySession(db, r.token, clock)).toBeNull();
    at(1);
    const r2 = await login(db, 'nikita@example.com', 'trenirovka7', clock);
    if (!r2.ok) throw new Error();
    logout(db, r2.token);
    expect(userBySession(db, r2.token, clock)).toBeNull();
  });
});

describe('changePassword', () => {
  const id = () => (db.prepare('SELECT id FROM users').get() as { id: number }).id;
  it('неверный текущий и слабый новый отклоняются', async () => {
    expect(await changePassword(db, id(), 'нет', 'Prisyad-80kg', true, clock)).toEqual({ ok: false, error: 'wrong_current' });
    expect(await changePassword(db, id(), 'trenirovka7', 'short1', true, clock)).toEqual({ ok: false, error: 'weak' });
  });
  it('сохраняет, закрывает другие сессии и выдаёт новую', async () => {
    const other = await login(db, 'nikita@example.com', 'trenirovka7', clock);
    if (!other.ok) throw new Error();
    const r = await changePassword(db, id(), 'trenirovka7', 'Prisyad-80kg', true, clock);
    if (!r.ok) throw new Error();
    expect(userBySession(db, other.token, clock)).toBeNull();
    expect(userBySession(db, r.token, clock)?.passwordChangedAt).toBe(clock().toISOString());
    expect((await login(db, 'nikita@example.com', 'Prisyad-80kg', clock)).ok).toBe(true);
  });
  it('без logoutOthers другие сессии живут', async () => {
    const other = await login(db, 'nikita@example.com', 'trenirovka7', clock);
    if (!other.ok) throw new Error();
    await changePassword(db, id(), 'trenirovka7', 'Prisyad-80kg', false, clock);
    expect(userBySession(db, other.token, clock)).not.toBeNull();
  });
});
