import { describe, expect, it } from 'vitest';
import type { ReviewExercise, ReviewSection } from '../../../../shared/types';
import { sectionOpenByDefault, sectionStarts, sectionSummary } from './sections';

const ex = (over: Partial<ReviewExercise> = {}): ReviewExercise => ({ id: 'a', name: 'Мост', slug: null, sets: [], note: null, thread: [], newCount: 0, ...over });
const sec = (folded: boolean, exercises: ReviewExercise[], title = 'Разминка'): ReviewSection => ({ key: 'k', title, folded, exercises });
const comment = { id: '1', author: 'trainer' as const, text: 'ок', timecodeSec: null, videoId: null, createdAt: 'x', isNew: false };

describe('sectionOpenByDefault', () => {
  it('свёрнутый блок без комментариев закрыт', () => expect(sectionOpenByDefault(sec(true, [ex()]))).toBe(false));
  it('открыт, если есть переписка', () => expect(sectionOpenByDefault(sec(true, [ex(), ex({ thread: [comment] })]))).toBe(true));
  it('открыт, если есть заметка', () => expect(sectionOpenByDefault(sec(true, [ex({ note: 'тяжело' })]))).toBe(true));
  it('открыт, если есть новое', () => expect(sectionOpenByDefault(sec(true, [ex({ newCount: 1 })]))).toBe(true));
  it('несвёрнутый блок всегда открыт', () => expect(sectionOpenByDefault(sec(false, [ex()]))).toBe(true));
});

describe('sectionSummary', () => {
  it('название и число упражнений', () => expect(sectionSummary(sec(true, [ex(), ex()]))).toBe('Разминка · 2'));
  it('с числом новых и склонением', () => {
    expect(sectionSummary(sec(true, [ex({ newCount: 1 })]))).toBe('Разминка · 1 · 1 новый');
    expect(sectionSummary(sec(true, [ex({ newCount: 2 }), ex({ newCount: 1 })]))).toBe('Разминка · 2 · 3 новых');
  });
});

describe('sectionStarts', () => {
  it('нумерация сквозная только по несвёрнутым', () => {
    expect(sectionStarts([sec(true, [ex(), ex()]), sec(false, [ex(), ex(), ex()]), sec(true, [ex()]), sec(false, [ex()])])).toEqual([null, 1, null, 4]);
  });
});
