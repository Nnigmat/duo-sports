import type { AiRules } from '../shared/types';
import type { Db } from './db';

export const AI_RULES_MAX = 20000;

/** Пока админ ничего не сохранил, агент получает этот текст */
export const DEFAULT_AI_RULES = 'В разминке и заминке сначала упражнения стоя, потом сидя, потом лёжа, чтобы не вставать и не ложиться несколько раз.';

type Row = { text: string; updated_at: string; display_name: string | null; email: string | null };

export function getAiRules(db: Db): AiRules {
  const row = db
    .prepare('SELECT r.text, r.updated_at, u.display_name, u.email FROM ai_rules r LEFT JOIN users u ON u.id = r.updated_by WHERE r.id = 1')
    .get() as Row | undefined;
  if (!row) return { text: DEFAULT_AI_RULES, updatedAt: null, updatedBy: null };
  return { text: row.text, updatedAt: row.updated_at, updatedBy: row.display_name ?? row.email };
}

/** Заменяет правила целиком; одна строка на всю базу. */
export function setAiRules(db: Db, actorId: number, text: string, clock: () => Date = () => new Date()): AiRules {
  db.prepare(
    `INSERT INTO ai_rules (id, text, updated_at, updated_by) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  ).run(text, clock().toISOString(), actorId);
  return getAiRules(db);
}
