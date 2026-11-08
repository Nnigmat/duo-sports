import { FEELING_LABELS } from '../../../../../shared/feeling';
import type { Face } from '../chibi/faces';

export type { Face };

export interface Rating {
  value: number;
  label: string;
  /** Пояснение под выбранной оценкой */
  hint: string;
}

/** Шкала самочувствия: 1 — «Плохо», 5 — «Отлично». Тексты из макета «Обратная связь». */
export const RATINGS: Rating[] = [
  { value: 1, label: FEELING_LABELS[0], hint: 'было тяжело, нужно восстановиться' },
  { value: 2, label: FEELING_LABELS[1], hint: 'нагрузка на пределе' },
  { value: 3, label: FEELING_LABELS[2], hint: 'обычная тренировка' },
  { value: 4, label: FEELING_LABELS[3], hint: 'приятная усталость' },
  { value: 5, label: FEELING_LABELS[4], hint: 'полон сил' },
];

export const COMMENT_MAX = 1000;

/** Какое лицо и позу показать чибику под оценку; без оценки — спокойный по умолчанию */
export function faceFor(feeling: number | null): { face: Face; pose: 'stand' | 'rest' | 'cheer' } {
  switch (feeling) {
    case 1:
      return { face: 'tired', pose: 'rest' };
    case 2:
      return { face: 'tired', pose: 'stand' };
    case 3:
      return { face: 'neutral', pose: 'stand' };
    case 5:
      return { face: 'cheer', pose: 'cheer' };
    default:
      return { face: 'happy', pose: 'stand' };
  }
}

/** Оценка выбрана: «Отправить тренеру» доступна только тогда */
export function canSend(feeling: number | null): boolean {
  return feeling !== null && Number.isInteger(feeling) && feeling >= 1 && feeling <= 5;
}

/** Самочувствие для итога; null — оценки нет, итог отправлять нельзя. Пустой комментарий не уходит. */
export function feedbackOf(s: { feeling: number | null; comment: string }): { feeling: number; comment?: string } | null {
  if (!canSend(s.feeling)) return null;
  const comment = s.comment.trim().slice(0, COMMENT_MAX);
  return { feeling: s.feeling!, ...(comment ? { comment } : {}) };
}

/** Ключ против дубликата: создаётся при «Начать тренировку» и уходит с каждой повторной отправкой того же итога */
export function newSubmitKey(): string {
  // randomUUID есть только в защищённом контексте; на http (вебвью, локальная сеть) собираем uuid v4 сами
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
