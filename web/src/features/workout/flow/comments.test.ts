import { describe, expect, it } from 'vitest';
import type { CoachComment } from '../../../../../shared/types';
import { commentsFor, formatCommentDate, hasNewComments, latestComment, markRead, sortComments } from './comments';

const c = (id: string, exerciseId: string | null, createdAt: string, isNew = false): CoachComment => ({
  id,
  exerciseId,
  exerciseName: exerciseId ?? 'Тренировка',
  createdAt,
  text: `текст ${id}`,
  isNew,
});

const list = [
  c('a', 'dips', '2026-10-21T10:00:00'),
  c('b', 'dips', '2026-10-28T10:00:00', true),
  c('c', 'lunge', '2026-10-28T12:00:00', true),
  c('d', 'dips', '2026-10-14T10:00:00'),
  c('e', null, '2026-10-10T10:00:00'),
];

describe('sortComments', () => {
  it('сначала новые, внутри групп — по дате от свежих', () => {
    expect(sortComments(list).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd', 'e']);
  });

  it('не мутирует исходный список', () => {
    const copy = [...list];
    sortComments(list);
    expect(list).toEqual(copy);
  });
});

describe('commentsFor', () => {
  it('только комментарии этого упражнения', () => {
    expect(commentsFor(list, 'dips').map((x) => x.id)).toEqual(['a', 'b', 'd']);
  });
});

describe('latestComment', () => {
  it('самый свежий по дате, прочитанный или нет', () => {
    expect(latestComment(list, 'dips')?.id).toBe('b');
    expect(latestComment([c('x', 'dips', '2026-10-30T10:00:00'), ...list], 'dips')?.id).toBe('x');
  });

  it('undefined, если комментариев нет', () => {
    expect(latestComment(list, 'plank')).toBeUndefined();
  });
});

describe('hasNewComments', () => {
  it('есть непрочитанный к упражнению', () => {
    expect(hasNewComments(list, 'dips')).toBe(true);
    expect(hasNewComments(list, 'lunge')).toBe(true);
  });

  it('нет непрочитанных', () => {
    expect(hasNewComments([c('a', 'dips', '2026-10-21T10:00:00')], 'dips')).toBe(false);
    expect(hasNewComments(list, 'plank')).toBe(false);
  });
});

describe('formatCommentDate', () => {
  const now = new Date('2026-10-31T12:00:00');
  it('день и месяц в родительном падеже', () => {
    expect(formatCommentDate('2026-10-28T10:00:00', now)).toBe('28 октября');
    expect(formatCommentDate('2026-09-30T10:00:00', now)).toBe('30 сентября');
    expect(formatCommentDate('2026-03-01T10:00:00', now)).toBe('1 марта');
  });

  it('другой год добавляется', () => {
    expect(formatCommentDate('2025-12-31T10:00:00', now)).toBe('31 декабря 2025');
  });
});

describe('markRead', () => {
  it('снимает «новый» только у комментариев этого упражнения', () => {
    const out = markRead(list, 'dips');
    expect(out.filter((x) => x.isNew).map((x) => x.id)).toEqual(['c']);
    expect(out.find((x) => x.id === 'b')?.isNew).toBe(false);
  });

  it('не мутирует исходный список и не трогает уже прочитанные', () => {
    markRead(list, 'dips');
    expect(list.find((x) => x.id === 'b')?.isNew).toBe(true);
    expect(markRead(list, 'plank')).toEqual(list);
  });
});
