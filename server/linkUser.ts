/** Связь тренера и ученика создаёт админ: npm run link-user -- <email тренера> <email ученика> */
import path from 'node:path';
import { openDb } from './db';
import { linkAthlete } from './trainerLinks';

const [trainerEmail, athleteEmail] = process.argv.slice(2);
if (!trainerEmail || !athleteEmail) {
  console.error('Использование: npm run link-user -- <email тренера> <email ученика>');
  process.exit(1);
}
const db = openDb(path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db'));
const idOf = (email: string) => (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined)?.id;
const t = idOf(trainerEmail);
const a = idOf(athleteEmail);
if (!t || !a) {
  console.error('Пользователь не найден');
  process.exit(1);
}
const r = linkAthlete(db, t, a);
if (!r.ok) {
  console.error(r.error === 'not_trainer' ? 'Первый аккаунт не тренер' : r.error === 'not_athlete' ? 'Второй аккаунт не спортсмен' : 'Пользователь не найден');
  process.exit(1);
}
console.log(`Связаны: ${trainerEmail} → ${athleteEmail}`);
