import type { ReviewSection } from '../../../../shared/types';

/** Свёрнутый блок открыт сразу, если в нём есть что прочитать: переписка, заметка или новое */
export function sectionOpenByDefault(sec: ReviewSection): boolean {
  return !sec.folded || sec.exercises.some((e) => e.thread.length > 0 || e.note !== null || e.newCount > 0);
}

/** Подпись заголовка свёрнутого блока: «Разминка · 12 · 2 новых» */
export function sectionSummary(sec: ReviewSection): string {
  const fresh = sec.exercises.reduce((sum, e) => sum + e.newCount, 0);
  const base = `${sec.title} · ${sec.exercises.length}`;
  return fresh > 0 ? `${base} · ${fresh} ${fresh === 1 ? 'новый' : 'новых'}` : base;
}

/** Сквозные номера карточек: с какого номера начинается каждый блок; свёрнутые блоки не нумеруются (null) */
export function sectionStarts(sections: ReviewSection[]): Array<number | null> {
  let next = 1;
  return sections.map((s) => {
    if (s.folded) return null;
    const start = next;
    next += s.exercises.length;
    return start;
  });
}
