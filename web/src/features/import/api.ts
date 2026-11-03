import type { ImportCommit, ImportContextResponse, ImportRecord } from '../../../../shared/types';

/** Запросы импорта к серверу. Компоненты их не вызывают: страница передаёт их потоку шагов. */

export interface ImportActions {
  commit: (commit: ImportCommit) => Promise<ImportRecord>;
  undo: (id: number) => Promise<ImportRecord>;
  redo: (id: number) => Promise<ImportRecord>;
}

/** Понятный текст для ошибки сервера */
export function errorText(status: number, error?: string): string {
  if (status === 401) return 'Сессия закончилась: войдите заново';
  if (status === 410) return 'Отменить импорт можно было в течение 24 часов';
  if (status === 409) return 'С этим импортом уже что-то сделали: обновите страницу';
  if (status === 404) return 'Импорт не найден';
  if (status === 400) return `Сервер не принял данные${error ? `: ${error}` : ''}`;
  return `Сервер ответил ${status}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Нет связи с сервером');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorText(res.status, body.error));
  }
  return res.json() as Promise<T>;
}

const post = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

/** base — «/api» у спортсмена, «/api/trainer/athletes/:id» у тренера: тогда тренировки попадают ученику */
export const fetchImportContext = (base = '/api') => request<ImportContextResponse>(`${base}/import/context`);

export const importActionsFor = (base = '/api'): ImportActions => ({
  commit: (commit) => post<ImportRecord>(`${base}/imports`, commit),
  undo: (id) => post<ImportRecord>(`${base}/imports/${id}/undo`),
  redo: (id) => post<ImportRecord>(`${base}/imports/${id}/redo`),
});

export const importActions: ImportActions = importActionsFor();
