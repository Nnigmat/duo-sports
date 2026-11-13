import type { EquipmentItem, EquipmentResponse } from '../../../../shared/types';

/** Запросы вкладки «Инвентарь». Компоненты их не вызывают. */

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (body && typeof body.error === 'string' && body.error) return new Error(body.error);
  if (res.status === 401) return new Error('Сессия закончилась: войдите заново');
  if (res.status === 403) return new Error('Инвентарь меняют тренер и админ');
  return new Error(`Сервер ответил ${res.status}`);
}

async function send(method: string, body?: unknown): Promise<Response> {
  const res = await fetch('/api/equipment', {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  }).catch(() => null);
  if (!res) throw new Error('Нет связи с сервером');
  if (!res.ok) throw await failure(res);
  return res;
}

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  return ((await (await send('GET')).json()) as EquipmentResponse).equipment;
}

export async function createEquipment(name: string): Promise<EquipmentItem> {
  return (await (await send('POST', { name })).json()) as EquipmentItem;
}
