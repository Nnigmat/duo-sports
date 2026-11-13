import type { EquipmentItem } from '../shared/types';
import type { Db } from './db';

export const EQUIPMENT_WRITE_FORBIDDEN = 'Инвентарь меняют тренер и админ';
export const EQUIPMENT_DUPLICATE = 'Такой инвентарь уже есть';
export const NAME_MAX = 60;

export const canManageEquipment = (role: string): boolean => role === 'trainer' || role === 'admin';

const keyOf = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е');

/** Название: непустое, до NAME_MAX знаков, пробелы по краям и подряд сжимаются */
export function validateName(body: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const raw = (body as { name?: unknown } | null)?.name;
  if (typeof raw !== 'string') return { ok: false, error: 'Название обязательно' };
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Название обязательно' };
  if (name.length > NAME_MAX) return { ok: false, error: `Название не длиннее ${NAME_MAX} знаков` };
  return { ok: true, name };
}

interface Row {
  id: number;
  name: string;
}

/** Пока справочник пуст, в него попадает инвентарь, уже указанный у упражнений */
function ensureEquipment(db: Db) {
  if ((db.prepare('SELECT COUNT(*) AS n FROM equipment').get() as { n: number }).n > 0) return;
  const insert = db.prepare('INSERT OR IGNORE INTO equipment (name, name_key, created_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();
  db.transaction(() => {
    for (const { equipment } of db.prepare('SELECT equipment FROM exercises ORDER BY id').all() as Array<{ equipment: string }>) {
      for (const name of JSON.parse(equipment) as string[]) if (name.trim()) insert.run(name.trim(), keyOf(name), now);
    }
  })();
}

export function equipmentOf(db: Db): EquipmentItem[] {
  ensureEquipment(db);
  const used = new Map<string, number>();
  for (const { equipment } of db.prepare('SELECT equipment FROM exercises').all() as Array<{ equipment: string }>) {
    for (const k of new Set((JSON.parse(equipment) as string[]).map(keyOf))) used.set(k, (used.get(k) ?? 0) + 1);
  }
  return (db.prepare('SELECT id, name FROM equipment').all() as Row[])
    .map((r) => ({ id: String(r.id), name: r.name, exercises: used.get(keyOf(r.name)) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export function createEquipment(db: Db, name: string): { ok: true; item: EquipmentItem } | { ok: false; error: 'duplicate' } {
  ensureEquipment(db);
  const info = db.prepare('INSERT OR IGNORE INTO equipment (name, name_key, created_at) VALUES (?, ?, ?)').run(name, keyOf(name), new Date().toISOString());
  if (info.changes === 0) return { ok: false, error: 'duplicate' };
  return { ok: true, item: { id: String(info.lastInsertRowid), name, exercises: equipmentOf(db).find((e) => e.name === name)?.exercises ?? 0 } };
}
