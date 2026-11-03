import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from './defaultExercises';
import { migrateSharedExercises, openDb, type Db } from './db';
import { deleteExercise, setDemo } from './exercises';
import { ensureLibrary, libraryOf } from './imports';
import Database from 'better-sqlite3';

let db: Db;
beforeEach(() => {
  db = openDb(':memory:');
});

describe('общая библиотека упражнений', () => {
  it('стартовый набор кладётся один раз, повторный вызов ничего не дублирует', () => {
    expect(libraryOf(db)).toEqual([]);
    ensureLibrary(db);
    ensureLibrary(db);
    expect(libraryOf(db)).toHaveLength(DEFAULT_EXERCISES.length);
    expect(libraryOf(db)[0]).toEqual(DEFAULT_EXERCISES[0]);
  });
  it('непустая библиотека набор не получает', () => {
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('x', 'Икс', 'reps', 'core', 'z')").run();
    ensureLibrary(db);
    expect(libraryOf(db)).toHaveLength(1);
  });
  it('notes и demo отдаются, только если заполнены; ссылки video нет', () => {
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, notes, video_url, demo_female, created_at) VALUES ('x', 'Икс', 'reps', 'core', '1. Раз\n2. Два', 'https://old', 'a.mp4', 'z')").run();
    expect(libraryOf(db)[0]).toMatchObject({ id: 'x', notes: '1. Раз\n2. Два', demo: { female: 'a.mp4' } });
    expect(libraryOf(db)[0]).not.toHaveProperty('video');
    expect(libraryOf(db)[0]!.demo).not.toHaveProperty('male');
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('y', 'Игрек', 'reps', 'core', 'z')").run();
    expect(libraryOf(db)[1]).not.toHaveProperty('notes');
    expect(libraryOf(db)[1]).not.toHaveProperty('demo');
  });
  it('setDemo ставит и очищает ролик и возвращает прежний файл', () => {
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('x', 'Икс', 'reps', 'core', 'z')").run();
    expect(setDemo(db, 'x', 'male', 'm1.mp4')).toEqual({ ok: true });
    expect(setDemo(db, 'x', 'male', 'm2.mp4')).toEqual({ ok: true, previous: 'm1.mp4' });
    expect(libraryOf(db)[0]).toMatchObject({ demo: { male: 'm2.mp4' } });
    expect(setDemo(db, 'x', 'male', null)).toEqual({ ok: true, previous: 'm2.mp4' });
    expect(libraryOf(db)[0]).not.toHaveProperty('demo');
    expect(setDemo(db, 'net', 'male', 'a.mp4')).toEqual({ ok: false });
  });
  it('deleteExercise возвращает файлы роликов, для чужого slug null', () => {
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, demo_female, demo_male, created_at) VALUES ('x', 'Икс', 'reps', 'core', 'f.mp4', 'm.mp4', 'z')").run();
    expect(deleteExercise(db, 'x')).toEqual(['f.mp4', 'm.mp4']);
    expect(deleteExercise(db, 'x')).toBeNull();
  });
});

describe('миграция на общую библиотеку', () => {
  const oldDb = () => {
    const d = new Database(':memory:');
    d.pragma('foreign_keys = ON');
    d.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL, password_changed_at TEXT, created_at TEXT NOT NULL);
      CREATE TABLE imports (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, undone_at TEXT, summary TEXT NOT NULL, payload TEXT NOT NULL, snapshot TEXT NOT NULL DEFAULT '{}');
      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, slug TEXT NOT NULL, name TEXT NOT NULL,
        aliases TEXT NOT NULL DEFAULT '[]', muscles TEXT NOT NULL DEFAULT '[]', kind TEXT NOT NULL, group_id TEXT NOT NULL,
        video_url TEXT, notes TEXT, import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL, created_at TEXT NOT NULL, UNIQUE (user_id, slug)
      );
      INSERT INTO users VALUES (1, 'a@x', 'h', 'athlete', NULL, 't'), (2, 'b@x', 'h', 'athlete', NULL, 't');
      INSERT INTO imports VALUES (7, 2, 't', NULL, '{}', '{}', '{}');
    `);
    const ins = d.prepare('INSERT INTO exercises (user_id, slug, name, kind, group_id, video_url, notes, import_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    ins.run(1, 'plank', 'Планка', 'time', 'core', null, null, null, 'a');
    ins.run(1, 'squat', 'Присед A', 'weight', 'legs', null, null, null, 'a');
    ins.run(2, 'plank', 'Планка B', 'time', 'core', null, '1. Спина прямая', null, 'b');
    ins.run(2, 'squat', 'Присед B', 'weight', 'legs', null, null, 7, 'b');
    ins.run(2, 'curl', 'Сгибания', 'weight', 'arms', '/v/c.mp4', null, 7, 'b');
    return d;
  };

  it('сливает дубли по slug: побеждает заполненная, иначе самая ранняя', () => {
    const d = oldDb();
    migrateSharedExercises(d);
    const cols = (d.prepare('PRAGMA table_info(exercises)').all() as Array<{ name: string }>).map((c) => c.name);
    expect(cols).not.toContain('user_id');
    const rows = d.prepare('SELECT slug, name, notes, import_id FROM exercises ORDER BY id').all();
    expect(rows).toEqual([
      { slug: 'squat', name: 'Присед A', notes: null, import_id: null },
      { slug: 'plank', name: 'Планка B', notes: '1. Спина прямая', import_id: null },
      { slug: 'curl', name: 'Сгибания', notes: null, import_id: 7 },
    ]);
    expect(() => d.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('plank', 'x', 'reps', 'core', 'z')").run()).toThrow();
    expect(d.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 2 });
  });
  it('идемпотентна', () => {
    const d = oldDb();
    migrateSharedExercises(d);
    const before = d.prepare('SELECT * FROM exercises ORDER BY id').all();
    migrateSharedExercises(d);
    expect(d.prepare('SELECT * FROM exercises ORDER BY id').all()).toEqual(before);
  });
});
