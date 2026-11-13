/**
 * Одноразовая расстановка инвентаря упражнениям библиотеки по названию: npm run migrate:equipment
 * База берётся из DATA_DIR. Перед запуском на сервере нужна копия: sqlite3 <app.db> ".backup ~/app.db.bak".
 * Трогает только упражнения с пустым инвентарём, поэтому повторный запуск безопасен.
 * Что не распознано, остаётся пустым и попадает в отчёт: его проставляют руками в форме упражнения.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Db, openDb } from './db';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

/** Инвентарь по названию. Не угадали — пусто. */
export function guessEquipment(name: string): string[] {
  const n = norm(name);
  const out: string[] = [];
  const has = (re: RegExp) => re.test(n);

  if (has(/штанг/)) out.push('Штанга');
  if (has(/гантел(ь|ью)(?![а-я])/)) out.push('Гантель');
  else if (has(/гантел/)) out.push('2 гантели');
  if (has(/(^|[^а-я])гир(я|ю|ей|и|ями)(?![а-я])/)) out.push('Гиря');
  if (has(/турник|подтягиван|в висе/)) out.push('Турник');
  if (has(/скакалк/)) out.push('Скакалка');
  if (has(/блок|тренажер|жим ногами|сгибания ног|разгибания ног|гиперэкстенз/)) out.push('Тренажёр');
  if (has(/жим[а-я ]* леж|скамь/) || (has(/жим/) && has(/леж/))) {
    if (!out.some((e) => e === 'Штанга' || e === 'Гантель' || e === '2 гантели') && has(/жим[а-я ]* леж/)) out.unshift('Штанга');
    out.push('Скамья');
  }
  if (!out.length && has(/планк|скручиван|мост|ножниц|пресс/)) out.push('Коврик');
  return out;
}

export interface EquipmentReport {
  /** Упражнений, которым проставлен инвентарь */
  updated: number;
  /** Названия упражнений, которые не удалось распознать */
  unknown: string[];
}

export function migrateEquipment(db: Db): EquipmentReport {
  const report: EquipmentReport = { updated: 0, unknown: [] };
  const rows = db.prepare("SELECT slug, name FROM exercises WHERE equipment = '[]' ORDER BY id").all() as Array<{ slug: string; name: string }>;
  const set = db.prepare('UPDATE exercises SET equipment = ? WHERE slug = ?');
  db.transaction(() => {
    for (const r of rows) {
      const gear = guessEquipment(r.name);
      if (!gear.length) {
        report.unknown.push(r.name);
        continue;
      }
      set.run(JSON.stringify(gear), r.slug);
      report.updated++;
    }
  })();
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db');
  const report = migrateEquipment(openDb(file));
  console.log(`База: ${file}`);
  console.log(`Инвентарь проставлен: ${report.updated}`);
  if (report.unknown.length) console.log(`Не распознано (без снаряда или проставить руками): ${report.unknown.join('; ')}`);
}
