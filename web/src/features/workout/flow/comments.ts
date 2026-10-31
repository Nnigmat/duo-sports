import type { CoachComment } from '../../../../../shared/types';
import { MONTHS } from './ru';

const time = (c: CoachComment) => Date.parse(c.createdAt);

/** Сначала новые, внутри групп от свежих к старым. */
export function sortComments(comments: CoachComment[]): CoachComment[] {
  return [...comments].sort((a, b) => Number(b.isNew) - Number(a.isNew) || time(b) - time(a));
}

export function commentsFor(comments: CoachComment[], exerciseId: string): CoachComment[] {
  return comments.filter((c) => c.exerciseId === exerciseId);
}

/** Последний по дате комментарий к упражнению: его текст показывается под чибиком. */
export function latestComment(comments: CoachComment[], exerciseId: string): CoachComment | undefined {
  return commentsFor(comments, exerciseId).reduce<CoachComment | undefined>(
    (best, c) => (!best || time(c) > time(best) ? c : best),
    undefined,
  );
}

/** Спортсмен открыл комментарии к упражнению: «новый» снимается. */
export function markRead(comments: CoachComment[], exerciseId: string): CoachComment[] {
  return comments.map((c) => (c.exerciseId === exerciseId && c.isNew ? { ...c, isNew: false } : c));
}

/** Есть непрочитанный комментарий: на кнопке «Техника» горит точка. */
export function hasNewComments(comments: CoachComment[], exerciseId: string): boolean {
  return commentsFor(comments, exerciseId).some((c) => c.isNew);
}

/** «28 октября»; для другого года добавляется год. */
export function formatCommentDate(iso: string, now: Date): string {
  const d = new Date(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
