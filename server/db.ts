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

-- Импорт тренировок: каждая запись знает, что создала, чтобы отмена убрала только своё
CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  undone_at TEXT,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL,
  snapshot TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS imports_user ON imports(user_id, created_at);
CREATE TABLE IF NOT EXISTS user_flags (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
-- Библиотека упражнений общая для всех: уникальность по slug, автора нет
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  muscles TEXT NOT NULL DEFAULT '[]',
  kind TEXT NOT NULL CHECK (kind IN ('reps', 'weight', 'time')),
  group_id TEXT NOT NULL,
  video_url TEXT,
  notes TEXT,
  import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT,
  title TEXT NOT NULL,
  blocks TEXT NOT NULL,
  structure TEXT,
  import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS workouts_slug ON workouts(user_id, slug) WHERE slug IS NOT NULL;
CREATE TABLE IF NOT EXISTS sessions_done (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  steps TEXT NOT NULL,
  videos INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_done_user ON sessions_done(user_id, date);
-- Комментарии тренера: к упражнению (slug из библиотеки спортсмена), к видео или ко всей тренировке
CREATE TABLE IF NOT EXISTS coach_comments (
  id INTEGER PRIMARY KEY,
  athlete_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_slug TEXT,
  exercise_name TEXT NOT NULL,
  video_id TEXT,
  video_label TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  seen_at TEXT
);
CREATE INDEX IF NOT EXISTS coach_comments_athlete ON coach_comments(athlete_id, created_at);
CREATE TABLE IF NOT EXISTS plan_entries (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, date, workout_id)
);
-- «Пропустить»: тренировка остаётся в плане невыполненной, но её больше не переносят и о ней не напоминают
CREATE TABLE IF NOT EXISTS plan_skips (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date, workout_id)
);
-- «Пауза»: дни с start_date по end_date включительно не считаются пропущенными, недели с паузой серию не обрывают
CREATE TABLE IF NOT EXISTS plan_pauses (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, start_date)
);
`;

/** Открывает базу (файл или ':memory:'), включает WAL и foreign_keys, создаёт таблицы. */
export function openDb(file: string): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  migrate(db);
  return db;
}

/** Старая схема: упражнения по пользователям (UNIQUE(user_id, slug)). Переносит в общую библиотеку, идемпотентно. */
export function migrateSharedExercises(db: Db) {
  const cols = (db.prepare('PRAGMA table_info(exercises)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!cols.includes('user_id')) return;
  type Row = { id: number; slug: string; name: string; aliases: string; muscles: string; kind: string; group_id: string; video_url: string | null; notes: string | null; import_id: number | null; created_at: string };
  const filled = (r: Row) => (r.notes?.trim() ? 1 : 0) + (r.video_url?.trim() ? 1 : 0);
  db.transaction(() => {
    const rows = db.prepare('SELECT id, slug, name, aliases, muscles, kind, group_id, video_url, notes, import_id, created_at FROM exercises ORDER BY id').all() as Row[];
    // из дублей по slug берём ту, где больше заполнено (заметки, видео), при равенстве самую раннюю
    const best = new Map<string, Row>();
    for (const r of rows) {
      const cur = best.get(r.slug);
      if (!cur || filled(r) > filled(cur)) best.set(r.slug, r);
    }
    db.exec(`CREATE TABLE exercises_new (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      aliases TEXT NOT NULL DEFAULT '[]',
      muscles TEXT NOT NULL DEFAULT '[]',
      kind TEXT NOT NULL CHECK (kind IN ('reps', 'weight', 'time')),
      group_id TEXT NOT NULL,
      video_url TEXT,
      notes TEXT,
      import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    )`);
    const ins = db.prepare('INSERT INTO exercises_new (id, slug, name, aliases, muscles, kind, group_id, video_url, notes, import_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const r of [...best.values()].sort((a, b) => a.id - b.id)) ins.run(r.id, r.slug, r.name, r.aliases, r.muscles, r.kind, r.group_id, r.video_url, r.notes, r.import_id, r.created_at);
    db.exec('DROP TABLE exercises; ALTER TABLE exercises_new RENAME TO exercises');
  })();
}

/** Колонки, добавленные после первого выпуска: у уже созданных баз их нет */
function migrate(db: Db) {
  const columns = (table: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
  if (!columns('sessions_done').includes('duration_sec')) db.exec('ALTER TABLE sessions_done ADD COLUMN duration_sec INTEGER');
  if (!columns('workouts').includes('structure')) db.exec('ALTER TABLE workouts ADD COLUMN structure TEXT');
  migrateSharedExercises(db);
}
