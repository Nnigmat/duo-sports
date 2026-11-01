import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEYLEN = 64;

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** Формат: `scrypt$<соль hex>$<ключ hex>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, saltHex, keyHex] = stored.split('$');
  if (kind !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await derive(password, Buffer.from(saltHex, 'hex'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
