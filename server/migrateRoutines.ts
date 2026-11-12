/**
 * Одноразовый перенос встроенных разминок и заминок в библиотеку: npm run migrate:routines
 * База берётся из DATA_DIR (как у create-user). Перед запуском на сервере нужна копия: sqlite3 <app.db> ".backup ~/app.db.bak".
 * Повторный запуск ничего не меняет.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Block, CommitBlock, RoutineInput, RoutineKind, TimedBlock } from '../shared/types';
import { type Db, openDb } from './db';
import { libraryOf } from './imports';
import { createRoutine } from './routines';

export interface MigrateReport {
  /** Создано разминок и заминок */
  routines: number;
  /** Тренировок, в которых блок заменён ссылкой */
  workouts: number;
  /** Блоки, которые остались встроенными, и почему */
  warnings: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

type Row = { id: number; title: string; blocks: string; structure: string; warmup_routine_id: number | null; cooldown_routine_id: number | null };

/** Блок-заглушка «Разминка · 5–7 мин»: одно «упражнение» с названием блока, настоящего списка нет */
const isPlaceholder = (b: TimedBlock) => b.exercises.length === 1 && b.exercises[0]!.name === b.title;

export function migrateRoutines(db: Db): MigrateReport {
  const report: MigrateReport = { routines: 0, workouts: 0, warnings: [] };
  const bySlug = new Map<string, string>();
  for (const e of libraryOf(db)) for (const n of [e.name, ...e.aliases]) bySlug.set(norm(n), e.id);
  /** Одинаковые по составу блоки делят одну разминку */
  const made = new Map<string, number>();

  const routineFor = (kind: RoutineKind, block: TimedBlock, slugs: string[]): number | null => {
    const key = JSON.stringify([kind, block.note ?? null, block.exercises.map((e, i) => [slugs[i], e.target.min, e.target.max, e.sides ?? null])]);
    const known = made.get(key);
    if (known !== undefined) return known;
    const input: RoutineInput = {
      kind,
      title: block.title,
      ...(block.note ? { note: block.note } : {}),
      items: block.exercises.map((e, i) => ({ exercise: slugs[i]!, sec: { min: e.target.min, max: e.target.max }, ...(e.sides ? { sides: e.sides } : {}) })),
    };
    // Название у разминок одного вида уникально: у второй «Разминка» будет «Разминка 2»
    for (let n = 1; n < 1000; n++) {
      const r = createRoutine(db, { ...input, title: n === 1 ? block.title : `${block.title} ${n}` });
      if (r.ok) {
        const id = (db.prepare('SELECT id FROM routines WHERE slug = ?').get(r.routine.id) as { id: number }).id;
        made.set(key, id);
        report.routines++;
        return id;
      }
      if (r.error !== 'duplicate') return null;
    }
    return null;
  };

  db.transaction(() => {
    const rows = db.prepare('SELECT id, title, blocks, structure, warmup_routine_id, cooldown_routine_id FROM workouts WHERE structure IS NOT NULL ORDER BY id').all() as Row[];
    for (const row of rows) {
      const structure = JSON.parse(row.structure) as Block[];
      const picks: Array<{ kind: RoutineKind; index: number; block: TimedBlock; slugs: string[] }> = [];
      for (const [kind, index, link] of [['warmup', 0, row.warmup_routine_id], ['cooldown', structure.length - 1, row.cooldown_routine_id]] as const) {
        const block = structure[index];
        // Ссылка уже есть, блок не с краю или не по таймеру: оставляем как есть
        if (link !== null || !block || block.mode !== 'timed' || block.kind !== kind || isPlaceholder(block)) continue;
        const slugs = block.exercises.map((e) => bySlug.get(norm(e.name)));
        const missing = block.exercises.filter((_, i) => !slugs[i]).map((e) => e.name);
        if (missing.length > 0) {
          report.warnings.push(`Тренировка «${row.title}» (${row.id}): в библиотеке нет «${missing.join('», «')}», блок остался встроенным`);
          continue;
        }
        picks.push({ kind, index, block, slugs: slugs as string[] });
      }
      // Без основной части тренировку не оставляем: structure должен быть непустым
      if (picks.length === 0 || picks.length >= structure.length) continue;
      const links = { warmup: row.warmup_routine_id, cooldown: row.cooldown_routine_id };
      const taken = new Set<number>();
      const blocks = JSON.parse(row.blocks) as CommitBlock[];
      for (const p of picks) {
        const id = routineFor(p.kind, p.block, p.slugs);
        if (id === null) {
          report.warnings.push(`Тренировка «${row.title}» (${row.id}): не удалось создать ${p.kind === 'warmup' ? 'разминку' : 'заминку'}, блок остался встроенным`);
          continue;
        }
        links[p.kind] = id;
        taken.add(p.index);
        // В blocks убираем первую разминку или последнюю заминку: порядок блоков тот же, что в structure
        const at = p.kind === 'warmup' ? blocks.findIndex((b) => b.kind === 'warmup') : blocks.map((b) => b.kind).lastIndexOf('cooldown');
        if (at >= 0) blocks.splice(at, 1);
      }
      if (taken.size === 0) continue;
      db.prepare('UPDATE workouts SET structure = ?, blocks = ?, warmup_routine_id = ?, cooldown_routine_id = ? WHERE id = ?').run(
        JSON.stringify(structure.filter((_, i) => !taken.has(i))),
        JSON.stringify(blocks),
        links.warmup,
        links.cooldown,
        row.id,
      );
      report.workouts++;
    }
  })();
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db');
  const report = migrateRoutines(openDb(file));
  console.log(`База: ${file}`);
  console.log(`Создано разминок и заминок: ${report.routines}; тренировок перенесено: ${report.workouts}`);
  for (const w of report.warnings) console.log(`Внимание: ${w}`);
}
