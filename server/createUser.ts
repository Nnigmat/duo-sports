/** Аккаунты создаёт админ: npm run create-user -- <email> <пароль> [athlete|trainer|admin] [female|male] */
import path from 'node:path';
import { createUser } from './auth';
import { openDb } from './db';
import type { Gender, Role } from '../shared/types';

const [email, password, role = 'athlete', gender] = process.argv.slice(2);
if (!email || !password || !['athlete', 'trainer', 'admin'].includes(role) || (gender !== undefined && gender !== 'female' && gender !== 'male')) {
  console.error('Использование: npm run create-user -- <email> <пароль> [athlete|trainer|admin] [female|male]');
  process.exit(1);
}
const db = openDb(path.join(path.resolve(process.env.DATA_DIR || 'data'), 'app.db'));
await createUser(db, email, password, role as Role, undefined, gender as Gender | undefined);
console.log(`Создан ${role}: ${email}`);
