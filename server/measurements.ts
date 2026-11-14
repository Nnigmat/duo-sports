import { isMeasurementKind, MEASUREMENT_KINDS, normalizeMeasurement } from '../shared/measurements';
import type { MeasurementEntry, MeasurementKind, MeasurementsResponse } from '../shared/types';
import type { Db } from './db';
import { isDate } from './imports';
import { addDays } from './today';

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Замеры пользователя, сгруппированные по дате, от старых к новым. */
export function measurementsOf(db: Db, userId: number): MeasurementsResponse {
  const rows = db
    .prepare('SELECT date, kind, value FROM measurements WHERE user_id = ? ORDER BY date')
    .all(userId) as Array<{ date: string; kind: MeasurementKind; value: number }>;
  const byDate = new Map<string, MeasurementEntry>();
  for (const r of rows) {
    let entry = byDate.get(r.date);
    if (!entry) {
      entry = { date: r.date, values: {} };
      byDate.set(r.date, entry);
    }
    entry.values[r.kind] = r.value;
  }
  // Показатели внутри дня в порядке MEASUREMENT_KINDS, чтобы ответ не зависел от порядка записи
  return {
    entries: [...byDate.values()].map((e) => ({
      date: e.date,
      values: Object.fromEntries(MEASUREMENT_KINDS.filter((k) => e.values[k] !== undefined).map((k) => [k, e.values[k]])),
    })),
  };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Проверяет `{ date, values }` и записывает все показатели одной транзакцией; повтор за день обновляет. */
export function saveMeasurement(db: Db, userId: number, input: unknown, today: string, now: () => Date = () => new Date()): SaveResult {
  if (!isObject(input)) return { ok: false, error: 'Нужен объект с датой и значениями' };
  const { date, values } = input;
  if (!isDate(date)) return { ok: false, error: 'Дата в формате ГГГГ-ММ-ДД' };
  if (date > addDays(today, 1)) return { ok: false, error: 'Дата не может быть в будущем' };
  if (!isObject(values)) return { ok: false, error: 'Нужны значения показателей' };
  const keys = Object.keys(values);
  if (keys.length === 0) return { ok: false, error: 'Заполните хотя бы один показатель' };

  const clean: Array<[MeasurementKind, number]> = [];
  for (const key of keys) {
    if (!isMeasurementKind(key)) return { ok: false, error: `Неизвестный показатель: ${key}` };
    const v = normalizeMeasurement(values[key]);
    if (v === null) return { ok: false, error: 'Значение: число больше 0 и не больше 999' };
    clean.push([key, v]);
  }

  const upsert = db.prepare(
    `INSERT INTO measurements (user_id, date, kind, value, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date, kind) DO UPDATE SET value = excluded.value`,
  );
  const createdAt = now().toISOString();
  db.transaction(() => {
    for (const [kind, v] of clean) upsert.run(userId, date, kind, v, createdAt);
  })();
  return { ok: true };
}
