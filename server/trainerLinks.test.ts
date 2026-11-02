import { beforeEach, describe, expect, it } from 'vitest';
import { createUser } from './auth';
import { openDb, type Db } from './db';
import { athletesOf, canAccessAthlete, linkAthlete, unlinkAthlete } from './trainerLinks';

let db: Db;
let trainer: number;
let other: number;
let athlete: number;
let admin: number;

beforeEach(async () => {
  db = openDb(':memory:');
  trainer = await createUser(db, 'coach@example.com', 'trenirovka7', 'trainer');
  other = await createUser(db, 'coach2@example.com', 'trenirovka7', 'trainer');
  athlete = await createUser(db, 'nikita@example.com', 'trenirovka7', 'athlete');
  admin = await createUser(db, 'admin@example.com', 'trenirovka7', 'admin');
});

describe('linkAthlete', () => {
  it('связывает тренера и спортсмена, повтор не ломается', () => {
    expect(linkAthlete(db, trainer, athlete)).toEqual({ ok: true });
    expect(linkAthlete(db, trainer, athlete)).toEqual({ ok: true });
    expect(athletesOf(db, trainer)).toEqual([athlete]);
  });
  it('отказывает, если роли не те', () => {
    expect(linkAthlete(db, athlete, trainer)).toEqual({ ok: false, error: 'not_trainer' });
    expect(linkAthlete(db, trainer, other)).toEqual({ ok: false, error: 'not_athlete' });
    expect(linkAthlete(db, 999, athlete)).toEqual({ ok: false, error: 'not_found' });
  });
  it('unlinkAthlete убирает связь', () => {
    linkAthlete(db, trainer, athlete);
    unlinkAthlete(db, trainer, athlete);
    expect(athletesOf(db, trainer)).toEqual([]);
  });
});

describe('canAccessAthlete', () => {
  beforeEach(() => void linkAthlete(db, trainer, athlete));
  it('тренер видит только своих', () => {
    expect(canAccessAthlete(db, { id: trainer, role: 'trainer' }, athlete)).toBe(true);
    expect(canAccessAthlete(db, { id: other, role: 'trainer' }, athlete)).toBe(false);
  });
  it('админ видит всех, спортсмен только себя', () => {
    expect(canAccessAthlete(db, { id: admin, role: 'admin' }, athlete)).toBe(true);
    expect(canAccessAthlete(db, { id: athlete, role: 'athlete' }, athlete)).toBe(true);
    expect(canAccessAthlete(db, { id: athlete, role: 'athlete' }, trainer)).toBe(false);
  });
});
