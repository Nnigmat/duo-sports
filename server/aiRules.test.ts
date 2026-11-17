import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_AI_RULES, getAiRules, setAiRules } from './aiRules';
import { createUser, setDisplayName } from './auth';
import { openDb, type Db } from './db';

let db: Db;
let adminId: number;

beforeEach(async () => {
  db = openDb(':memory:');
  adminId = await createUser(db, 'admin@example.com', 'trenirovka7', 'admin');
  setDisplayName(db, adminId, 'Никита');
});

describe('правила агента', () => {
  it('returns default rules when none saved', () => {
    expect(getAiRules(db)).toEqual({ text: DEFAULT_AI_RULES, updatedAt: null, updatedBy: null });
  });

  it('saves text with author and time', () => {
    setAiRules(db, adminId, 'Отдых 90 с', () => new Date('2026-11-17T18:40:00Z'));
    expect(getAiRules(db)).toEqual({ text: 'Отдых 90 с', updatedAt: '2026-11-17T18:40:00.000Z', updatedBy: 'Никита' });
  });

  it('falls back to email when author has no display name', async () => {
    const other = await createUser(db, 'second@example.com', 'trenirovka7', 'admin');
    expect(setAiRules(db, other, 'Текст').updatedBy).toBe('second@example.com');
  });

  it('second save replaces the first', () => {
    setAiRules(db, adminId, 'Первый');
    setAiRules(db, adminId, 'Второй');
    expect(db.prepare('SELECT COUNT(*) AS n FROM ai_rules').get()).toEqual({ n: 1 });
    expect(getAiRules(db).text).toBe('Второй');
  });
});
