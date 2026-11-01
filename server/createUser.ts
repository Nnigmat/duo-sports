/** Аккаунты создаёт админ: npm run create-user -- <email> <пароль> [athlete|trainer|admin] */
import path from 'node:path';
import { createUser } from './auth';
import { openDb } from './db';
import type { Role } from '../shared/types';

const [email, password, role = 'athlete'] = process.argv.slice(2);
if (!email || !password || !['athlete', 'trainer', 'admin'].includes(role)) {
  console.error('Использование: npm run create-user -- <email> <пароль> [athlete|trainer|admin]');
  process.exit(1);
}
const db = openDb(path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db'));
await createUser(db, email, password, role as Role);
console.log(`Создан ${role}: ${email}`);
