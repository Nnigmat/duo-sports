import { parseDraft, serializeDraft, type Draft } from './flow/draft';
import { pendingFeedbackPath } from './flow/pending';

/** localStorage может быть недоступен (приватный режим, вебвью): тогда прохождение просто не переживёт перезагрузку. */
export function loadDraft(key: string, now = Date.now()): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    const draft = parseDraft(raw, now);
    if (raw && !draft) localStorage.removeItem(key);
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: Draft): void {
  try {
    localStorage.setItem(key, serializeDraft(draft));
  } catch {
    // хранилище переполнено или недоступно — не мешаем тренировке
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // см. выше
  }
}

/** Путь на прохождение, которое остановилось на обратной связи; null — такого нет или хранилище недоступно */
export function pendingFeedback(userId: number, now = Date.now()): string | null {
  try {
    const entries: Array<[string, string | null]> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) entries.push([key, localStorage.getItem(key)]);
    }
    return pendingFeedbackPath(entries, userId, now);
  } catch {
    return null;
  }
}
