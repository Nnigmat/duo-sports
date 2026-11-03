/** Пол спортсмена: npm run set-gender -- <email> <female|male|none> */
import path from 'node:path';
import { setGender } from './auth';
import { openDb } from './db';

const [email, value] = process.argv.slice(2);
if (!email || !['female', 'male', 'none'].includes(value ?? '')) {
  console.error('Использование: npm run set-gender -- <email> <female|male|none>');
  process.exit(1);
}
const db = openDb(path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db'));
if (!setGender(db, email, value === 'none' ? null : (value as 'female' | 'male'))) {
  console.error('Пользователь не найден');
  process.exit(1);
}
console.log(`Пол ${email}: ${value}`);
