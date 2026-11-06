import { parseDraft, serializeDraft, type Draft } from './flow/draft';

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
