import type { DraftRequest, DraftResponse } from '../../../../shared/aiDraft';

/** Ошибка сборки со статусом ответа: 503 — сборка выключена на сервере */
export class DraftError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** POST /api/ai/workout-draft; ошибка сервера — DraftError с текстом из { error } */
export async function requestDraft(r: DraftRequest): Promise<DraftResponse> {
  const res = await fetch('/api/ai/workout-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(r),
    credentials: 'same-origin',
  }).catch(() => null);
  if (!res) throw new DraftError('Нет связи с сервером', 0);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    if (res.status === 401) throw new DraftError('Сессия закончилась: войдите заново', 401);
    throw new DraftError(body && typeof body.error === 'string' && body.error ? body.error : `Сервер ответил ${res.status}`, res.status);
  }
  return (await res.json()) as DraftResponse;
}
