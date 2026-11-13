/**
 * Одноразовая расстановка инвентаря упражнениям библиотеки по таблице «название → инвентарь»: npm run migrate:equipment
 * База берётся из DATA_DIR. Перед запуском на сервере нужна копия: sqlite3 <app.db> ".backup ~/app.db.bak".
 * Трогает только упражнения с пустым инвентарём, поэтому повторный запуск безопасен и заданное вручную не затирает.
 * Упражнения, которых нет в таблице, остаются как были и попадают в отчёт.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Db, openDb } from './db';

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

/** Инвентарь упражнений библиотеки; нет записи в таблице — упражнение не трогаем, [] — снаряд не нужен */
export const EQUIPMENT_TABLE: Array<[string, string[]]> = [
  // Ноги
  ['Приседания со штангой', ['Штанга']],
  ['Румынская тяга', ['Штанга']],
  ['Выпады', []], // с гантелями будет отдельное упражнение
  ['Подъёмы на носки', []], // с гантелями — тоже отдельное
  ['Жим ногами', ['Тренажёр']],
  ['Сгибания ног лёжа', ['Тренажёр']],
  ['Становая тяга', ['Штанга']],
  ['Ягодичный мост', ['Коврик']],
  // Спина
  ['Гиперэкстензия', ['Тренажёр']],
  ['Тяга верхнего блока', ['Тренажёр']],
  ['Тяга горизонтального блока', ['Тренажёр']],
  ['Подтягивания', ['Турник']],
  ['Тяга штанги в наклоне', ['Штанга']],
  ['Лодочка', ['Коврик']],
  // Грудь и плечи
  ['Жим лёжа', ['Штанга', 'Скамья']],
  ['Жим на наклонной скамье', ['Штанга', 'Скамья']],
  ['Разведения гантелей', ['2 гантели', 'Скамья']],
  ['Отжимания с касанием предмета', ['Коврик', 'Упоры для отжиманий']],
  // Руки
  ['Отжимания на брусьях', ['Брусья']],
  ['Сгибания на бицепс', ['2 гантели']],
  ['Французский жим', ['Гантель']],
  ['Обратные отжимания от лавочки', ['Скамья']],
  ['Разгибание руки с гантелью в наклоне', ['Гантель']],
  // Пресс
  ['Планка', ['Коврик']],
  ['Скручивания', ['Коврик']],
  ['Подъём ног в висе', ['Турник']],
  ['Ножницы лёжа', ['Коврик']],
  ['Подтягивание колен в висе', ['Турник']],
  // Кардио
  ['Скакалка', ['Скакалка']],
  // Разминка и заминка: на полу — коврик
  ['Скручивание лёжа', ['Коврик']],
  ['Растяжка задней поверхности бедра сидя', ['Коврик']],
  ['Бабочка', ['Коврик']],
  ['Поза ребёнка', ['Коврик']],
  ['Расслабление лёжа на спине', ['Коврик']],
];

export const EQUIPMENT_BY_NAME = new Map(EQUIPMENT_TABLE.map(([name, gear]) => [norm(name), gear]));

export interface EquipmentReport {
  /** Упражнений, которым проставлен инвентарь */
  updated: number;
  /** Упражнения с пустым инвентарём, которых нет в таблице: проставить руками или оставить без снаряда */
  unlisted: string[];
}

export function migrateEquipment(db: Db): EquipmentReport {
  const report: EquipmentReport = { updated: 0, unlisted: [] };
  const rows = db.prepare("SELECT slug, name FROM exercises WHERE equipment = '[]' ORDER BY id").all() as Array<{ slug: string; name: string }>;
  const set = db.prepare('UPDATE exercises SET equipment = ? WHERE slug = ?');
  db.transaction(() => {
    for (const r of rows) {
      const gear = EQUIPMENT_BY_NAME.get(norm(r.name));
      if (!gear) report.unlisted.push(r.name);
      else if (gear.length) {
        set.run(JSON.stringify(gear), r.slug);
        report.updated++;
      }
    }
  })();
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db');
  const report = migrateEquipment(openDb(file));
  console.log(`База: ${file}`);
  console.log(`Инвентарь проставлен: ${report.updated}`);
  if (report.unlisted.length) console.log(`Не в таблице, остались без инвентаря: ${report.unlisted.join('; ')}`);
}
