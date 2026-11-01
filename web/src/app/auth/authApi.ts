import type { AuthUser, LoginFailure } from '../../../../shared/types';

async function post(url: string, body?: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
}

/** Текущий пользователь по cookie; null, если не вошёл. */
export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Не удалось проверить вход');
  return res.json();
}

export async function apiLogin(email: string, password: string): Promise<AuthUser | LoginFailure> {
  const res = await post('/api/auth/login', { email, password });
  if (res.ok) return res.json();
  if (res.status === 401 || res.status === 429) return res.json();
  throw new Error('Не удалось войти. Попробуйте ещё раз');
}

export const apiLogout = async () => void (await post('/api/auth/logout'));

export async function apiChangePassword(
  current: string,
  next: string,
  logoutOthers: boolean,
): Promise<'saved' | 'wrongCurrent'> {
  const res = await post('/api/auth/change-password', { current, next, logoutOthers });
  if (res.ok) return 'saved';
  if (res.status === 403) return 'wrongCurrent';
  throw new Error('Не удалось сменить пароль. Попробуйте ещё раз');
}
