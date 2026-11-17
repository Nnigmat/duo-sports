import type { AiRules } from '../../../../shared/types';

/** Запросы страницы «Правила агента». Компоненты их не вызывают. */

async function send(method: 'GET' | 'PUT', body?: unknown): Promise<AiRules> {
  const res = await fetch('/api/admin/ai-rules', {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  }).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: unknown } | null;
    if (res.status === 401) throw new Error('Сессия закончилась: войдите заново');
    if (err && typeof err.error === 'string' && err.error) throw new Error(err.error);
    throw new Error(`Сервер ответил ${res.status}`);
  }
  return (await res.json()) as AiRules;
}

export const fetchAiRules = (): Promise<AiRules> => send('GET');
export const saveAiRules = (text: string): Promise<AiRules> => send('PUT', { text });
