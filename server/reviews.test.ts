import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { markReviewed, reviewOf, sessionsAwaitingReview } from './reviews';
import { linkAthlete } from './trainerLinks';

let db: Db;
let athlete: number;
let trainer: number;
let otherTrainer: number;
const at = (iso: string) => () => new Date(iso);

const session = (user: number, date: string) =>
  Number(db.prepare("INSERT INTO sessions_done (user_id, title, date, finished_at, steps, videos) VALUES (?, 'Верх', ?, ?, '[]', 0)").run(user, date, `${date}T18:00:00Z`).lastInsertRowid);

beforeEach(async () => {
  db = openDb(':memory:');
  athlete = await createUser(db, 'a@example.com', 'trenirovka7', 'athlete');
  trainer = await createUser(db, 't@example.com', 'trenirovka7', 'trainer');
  otherTrainer = await createUser(db, 't2@example.com', 'trenirovka7', 'trainer');
  linkAthlete(db, trainer, athlete);
});

describe('статус разбора', () => {
  it('новая тренировка ждёт разбора', () => {
    const s = session(athlete, '2026-11-01');
    expect(reviewOf(db, s)).toEqual({ status: 'pending' });
  });
  it('тренер отмечает: статус «разобрана» со временем и автором', () => {
    const s = session(athlete, '2026-11-01');
    expect(markReviewed(db, { id: trainer, role: 'trainer' }, s, at('2026-11-02T19:40:00Z'))).toEqual({ ok: true });
    expect(reviewOf(db, s)).toEqual({ status: 'reviewed', reviewedAt: '2026-11-02T19:40:00.000Z', reviewerId: trainer });
  });
  it('повторная отметка не двигает время', () => {
    const s = session(athlete, '2026-11-01');
    markReviewed(db, { id: trainer, role: 'trainer' }, s, at('2026-11-02T19:40:00Z'));
    markReviewed(db, { id: trainer, role: 'trainer' }, s, at('2026-11-03T08:00:00Z'));
    expect(reviewOf(db, s)).toMatchObject({ reviewedAt: '2026-11-02T19:40:00.000Z' });
  });
  it('чужой тренер, сам спортсмен и несуществующая тренировка не могут', () => {
    const s = session(athlete, '2026-11-01');
    expect(markReviewed(db, { id: otherTrainer, role: 'trainer' }, s)).toEqual({ ok: false, error: 'forbidden' });
    expect(markReviewed(db, { id: athlete, role: 'athlete' }, s)).toEqual({ ok: false, error: 'forbidden' });
    expect(markReviewed(db, { id: trainer, role: 'trainer' }, 999)).toEqual({ ok: false, error: 'not_found' });
    expect(reviewOf(db, s)).toEqual({ status: 'pending' });
  });
  it('админ может разобрать любую', async () => {
    const admin = await createUser(db, 'adm@example.com', 'trenirovka7', 'admin');
    const s = session(athlete, '2026-11-01');
    expect(markReviewed(db, { id: admin, role: 'admin' }, s)).toEqual({ ok: true });
  });
  it('удаление тренировки убирает и разбор', () => {
    const s = session(athlete, '2026-11-01');
    markReviewed(db, { id: trainer, role: 'trainer' }, s);
    db.prepare('DELETE FROM sessions_done WHERE id = ?').run(s);
    expect(db.prepare('SELECT COUNT(*) AS n FROM reviews').get()).toEqual({ n: 0 });
  });
});

describe('sessionsAwaitingReview', () => {
  it('неразобранные тренировки спортсмена, свежие первыми; чужие и разобранные не в счёт', async () => {
    const stranger = await createUser(db, 's@example.com', 'trenirovka7', 'athlete');
    const a = session(athlete, '2026-10-30');
    const b = session(athlete, '2026-11-01');
    const c = session(athlete, '2026-10-28');
    session(stranger, '2026-11-01');
    markReviewed(db, { id: trainer, role: 'trainer' }, c);
    expect(sessionsAwaitingReview(db, athlete)).toEqual([b, a]);
  });
});
