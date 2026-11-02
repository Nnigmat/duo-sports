import type { SessionResult } from '../../../../shared/types';
/** Запросы фичи к серверу. Компоненты их не вызывают: контейнер сверху передаёт колбэки. */

export interface UploadedVideo {
  id: string;
  /** Относительный путь внутри data/, его и храним в базе */
  path: string;
}

/** Загрузить видеофайл подхода: тело запроса — сам файл. */
export async function uploadVideo(blob: Blob): Promise<UploadedVideo> {
  const res = await fetch('/api/videos', {
    method: 'POST',
    headers: { 'content-type': blob.type || 'video/webm' },
    body: blob,
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: undefined }));
    throw new Error(error ?? `Сервер ответил ${res.status}`);
  }
  return res.json();
}

/** Записать итог тренировки: день плана после этого отмечается выполненным. */
export async function saveSession(workoutId: string, result: SessionResult): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/workouts/${encodeURIComponent(workoutId)}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result),
    });
  } catch {
    throw new Error('Нет связи с сервером: итоги не сохранены, нажмите «Завершить» ещё раз');
  }
  if (!res.ok) throw new Error(res.status === 401 ? 'Сессия закончилась: войдите заново' : `Итоги не сохранены: сервер ответил ${res.status}`);
}
