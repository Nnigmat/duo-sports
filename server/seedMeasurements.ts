/** История замеров для ручной проверки: npm run seed-measurements -- <email> */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { MeasurementKind } from '../shared/types';
import { openDb, type Db } from './db';
import { measurementsOf, saveMeasurement } from './measurements';
import { addDays } from './today';

/** Дни от сегодня и значения; пропуски — показатель не записан в эту дату, икры только в двух последних */
const HISTORY: Array<[number, Partial<Record<MeasurementKind, number>>]> = [
  [-70, { weight: 78, chest: 98, waist: 86, belly: 92, hips: 100, thigh: 58, arm: 33 }],
  [-56, { weight: 77.4, chest: 97.5, waist: 85, hips: 99.6, thigh: 57.8, arm: 33.1 }],
  [-42, { weight: 76.8, waist: 84.2, belly: 90.5, hips: 99.1, arm: 33.3 }],
  [-28, { chest: 96.8, waist: 83.5, belly: 89.8, hips: 98.7, thigh: 57.1 }],
  [-14, { weight: 75.9, chest: 96.5, belly: 89, hips: 98.2, thigh: 56.9, arm: 33.6, calf: 37 }],
  [0, { weight: 75.2, chest: 96, waist: 82, belly: 88.1, hips: 97.9, thigh: 56.5, arm: 33.8, calf: 37.2 }],
];

/** Пишет HISTORY ученику, только если замеров у него ещё нет */
export function seedMeasurements(db: Db, userId: number, today: string): { ok: true; dates: number } | { ok: false; error: string } {
  if (measurementsOf(db, userId).entries.length > 0) return { ok: false, error: 'У пользователя уже есть замеры' };
  for (const [offset, values] of HISTORY) {
    const saved = saveMeasurement(db, userId, { date: addDays(today, offset), values }, today);
    if (!saved.ok) return saved;
  }
  return { ok: true, dates: HISTORY.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error('Использование: npm run seed-measurements -- <email>');
    process.exit(1);
  }
  const db = openDb(path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db'));
  const user = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email.trim()) as { id: number; role: string } | undefined;
  if (user?.role !== 'athlete') {
    console.error('Ученик с таким email не найден');
    process.exit(1);
  }
  const result = seedMeasurements(db, user.id, new Date().toISOString().slice(0, 10));
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`Замеры за ${result.dates} дат добавлены: ${email}`);
}
