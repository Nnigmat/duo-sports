import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'trainer', 'admin')),
  password_changed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_email ON login_attempts(email, at);
`;

/** Открывает базу (файл или ':memory:'), включает WAL и foreign_keys, создаёт таблицы. */
export function openDb(file: string): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}
