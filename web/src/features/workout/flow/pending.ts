import { draftKey, parseDraft } from './draft';

/**
 * Куда вернуть спортсмена при открытии приложения: если есть прохождение на обратной связи (итог не отправлен),
 * путь на него. Пары «ключ — строка» из хранилища; несколько — берём самое свежее. Нет — null.
 */
export function pendingFeedbackPath(entries: Array<[string, string | null]>, userId: number, now: number): string | null {
  const prefix = draftKey(userId, '', '').slice(0, -2); // «duo-sport:draft:1»
  let best: { path: string; updatedAt: number } | null = null;
  for (const [key, raw] of entries) {
    const m = key.startsWith(`${prefix}:`) ? /^([^:]+):(\d{4}-\d{2}-\d{2})$/.exec(key.slice(prefix.length + 1)) : null;
    if (!m) continue;
    const draft = parseDraft(raw, now);
    if (draft?.session.phase !== 'feedback') continue;
    if (!best || draft.updatedAt > best.updatedAt) best = { path: `/workout/${m[1]}?date=${m[2]}`, updatedAt: draft.updatedAt };
  }
  return best?.path ?? null;
}
