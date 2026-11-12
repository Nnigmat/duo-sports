/**
 * Только чтение: сколько реально занимали тренировки без отдыха.
 * npm run work-time [-- <id пользователя>]. Базу берёт из DATA_DIR (по умолчанию data), ничего в ней не меняет.
 */
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SessionStepResult } from '../shared/types';
import { workTimeStats } from './workTime';

const file = path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db');
const userId = process.argv[2] ? Number(process.argv[2]) : null;
const db = new Database(file, { readonly: true, fileMustExist: true });
console.log(`База: ${file}`);

const rows = db
  .prepare(`SELECT id, user_id, title, date, steps, duration_sec FROM sessions_done ${userId ? 'WHERE user_id = ?' : ''} ORDER BY date, id`)
  .all(...(userId ? [userId] : [])) as Array<{ id: number; user_id: number; title: string; date: string; steps: string; duration_sec: number | null }>;

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
for (const r of rows) {
  const stats = workTimeStats(r.duration_sec, JSON.parse(r.steps) as SessionStepResult[]);
  if (!stats) {
    console.log(`#${r.id} ${r.date} ${r.title}: нет замера`);
    continue;
  }
  const hasRest = stats.restSec > 0 ? '' : ' (отдыха в итоге нет: замер до его записи)';
  console.log(`#${r.id} ${r.date} ${r.title}: всего ${mmss(r.duration_sec!)}, отдых ${mmss(stats.restSec)}, без отдыха ${mmss(stats.activeSec)}, подходов ${stats.sets}, в среднем ${stats.perSetSec} с на подход${hasRest}${stats.setsSec === null ? ' (меток подходов нет)' : `; сами подходы ${mmss(stats.setsSec)}, шторки и переходы ${mmss(stats.gapSec!)}`}`);
}
db.close();
