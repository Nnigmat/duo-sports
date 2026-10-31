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
