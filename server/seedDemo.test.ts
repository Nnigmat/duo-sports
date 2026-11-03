import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb, type Db } from './db';
import { libraryOf } from './imports';
import { DEMO_MANIFEST, seedDemo } from './seedDemo';

let db: Db;
let root: string;
let assets: string;
let data: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-'));
  assets = path.join(root, 'assets');
  data = path.join(root, 'data');
  db = openDb(':memory:');
  db.prepare("INSERT INTO exercises (slug, name, aliases, kind, group_id, created_at) VALUES ('boat', 'Лодочка', '[]', 'time', 'back', 'z')").run();
  for (const e of DEMO_MANIFEST.filter((m) => m.folder === 'Лодочка' || m.folder === 'Выпады')) {
    fs.mkdirSync(path.join(assets, e.folder), { recursive: true });
    fs.writeFileSync(path.join(assets, e.folder, e.female), `f-${e.folder}`);
    fs.writeFileSync(path.join(assets, e.folder, e.male), `m-${e.folder}`);
  }
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const stored = () => fs.readdirSync(path.join(data, 'videos'));

describe('seedDemo', () => {
  it('копирует ролики найденного упражнения и ставит поля по полу', async () => {
    const r = await seedDemo(db, data, assets);
    expect(r.done).toEqual(['Лодочка']);
    const demo = libraryOf(db).find((e) => e.id === 'boat')!.demo!;
    expect(fs.readFileSync(path.join(data, 'videos', demo.female!), 'utf8')).toBe('f-Лодочка');
    expect(fs.readFileSync(path.join(data, 'videos', demo.male!), 'utf8')).toBe('m-Лодочка');
  });
  it('упражнения нет в библиотеке: в missing, файлы не копируются', async () => {
    const r = await seedDemo(db, data, assets);
    expect(r.missing).toContain('Выпады на месте');
    expect(stored()).toHaveLength(2);
  });
  it('нет папки с файлами: тоже в missing', async () => {
    const r = await seedDemo(db, data, assets);
    expect(r.missing).toContain('Ножницы лёжа');
  });
  it('повторный запуск заменяет ролики и не оставляет дублей на диске', async () => {
    await seedDemo(db, data, assets);
    await seedDemo(db, data, assets);
    expect(stored()).toHaveLength(2);
  });
});
