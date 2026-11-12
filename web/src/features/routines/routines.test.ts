import { describe, expect, it } from 'vitest';
import { draftTotal, emptyDraft, itemTime, metaText, mmss, moveItem, newItem, problems, searchRoutines, toInput, usedText } from './routines';

describe('форматы', () => {
  it('время мм:сс', () => {
    expect(mmss(270)).toBe('4:30');
    expect(mmss(45)).toBe('0:45');
  });
  it('мета и использование', () => {
    expect(metaText({ itemCount: 5, totalSec: 270 })).toBe('5 упр. · 4:30');
    expect(usedText(0)).toBe('Не используется');
    expect(usedText(1)).toBe('Используется в 1 тренировке');
    expect(usedText(3)).toBe('Используется в 3 тренировках');
    expect(usedText(11)).toBe('Используется в 11 тренировках');
  });
  it('время позиции', () => {
    expect(itemTime({ exercise: 'a', name: 'A', sec: { min: 30, max: 45 } })).toBe('30–45 с');
    expect(itemTime({ exercise: 'a', name: 'A', sec: { min: 30, max: 30 }, sides: ['Л', 'П'] })).toBe('30 с × 2');
  });
});

describe('поиск и порядок', () => {
  it('ищет по названию без учёта регистра', () => {
    const list = [{ title: 'Ноги, лёгкая' }, { title: 'Плечи' }];
    expect(searchRoutines(list, ' НОГИ ')).toEqual([list[0]]);
    expect(searchRoutines(list, '')).toBe(list);
  });
  it('moveItem не выходит за границы', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    const same = [1, 2];
    expect(moveItem(same, 0, -1)).toBe(same);
  });
});

describe('черновик', () => {
  it('пустой не сохраняется', () => {
    expect(problems(emptyDraft('warmup'))).toEqual(['Введите название', 'Добавьте хотя бы одно упражнение']);
  });
  it('собирает вход и считает сумму со сторонами', () => {
    const d = emptyDraft('cooldown');
    d.title = ' Растяжка ';
    d.items = [{ ...newItem('plank', 'Планка'), min: '20', max: '30' }, { ...newItem('stretch', 'Выпад'), sides: true }];
    expect(problems(d)).toEqual([]);
    expect(draftTotal(d)).toBe(30 + 60);
    expect(toInput(d)).toEqual({
      kind: 'cooldown',
      title: 'Растяжка',
      items: [
        { exercise: 'plank', sec: { min: 20, max: 30 } },
        { exercise: 'stretch', sec: { min: 30, max: 30 }, sides: ['Левая', 'Правая'] },
      ],
    });
  });
  it('неверные секунды блокируют сохранение', () => {
    const d = emptyDraft('warmup');
    d.title = 'X';
    d.items = [{ ...newItem('a', 'A'), min: '50', max: '40' }];
    expect(problems(d)).toContain('Исправьте секунды в упражнениях');
  });
});
