import { describe, expect, it } from 'vitest';
import { newExercisesFixture as list, weeksFixture as weeks } from './fixtures';
import {
  actionOf, createAll, diffSession, EMPTY_CHOICES, EXERCISES_LIMIT, filterCounts, firstUseWeek, footerText, needsGroup, previousSession,
  renamedNames, replacementOf, sessionChip, sessionItems, setAction, setGroup, skippedNames, tally, tallyText, useAllSimilar, useExisting, visibleExercises, weekSummary,
} from './preview';

describe('«Это упражнение из библиотеки»', () => {
  const ex = list.find((e) => e.name === 'Боковая планка')!;
  it('для недель: выбранное упражнение подменяет название, остальные не трогаем', () => {
    expect([...renamedNames(list, EMPTY_CHOICES)]).toEqual([]);
    const c = useExisting(EMPTY_CHOICES, ex.key, 'Планка с подъёмом ноги');
    expect([...renamedNames(list, c)]).toEqual([['Боковая планка', 'Планка с подъёмом ноги']]);
    expect([...renamedNames(list, createAll(c))]).toEqual([]);
  });
  it('запоминает, какое упражнение имелось в виду', () => {
    const c = useExisting(EMPTY_CHOICES, ex.key, 'Планка с подъёмом ноги');
    expect(actionOf(c, ex.key)).toBe('use');
    expect(replacementOf(ex, c)).toBe('Планка с подъёмом ноги');
  });
  it('без выбора подставляется похожее, «Создать все» выбор сбрасывает', () => {
    expect(replacementOf(ex, EMPTY_CHOICES)).toBe('Планка');
    const c = createAll(useExisting(EMPTY_CHOICES, ex.key, 'Другое'));
    expect(actionOf(c, ex.key)).toBe('create');
    expect(replacementOf(ex, c)).toBe('Планка');
  });
});

describe('выбор по новым упражнениям', () => {
  it('по умолчанию всё создаётся', () => {
    expect(tally(list, EMPTY_CHOICES)).toEqual({ create: 31, use: 0, skip: 0 });
    expect(actionOf(EMPTY_CHOICES, 'e0')).toBe('create');
  });
  it('setAction не меняет исходный объект', () => {
    const next = setAction(EMPTY_CHOICES, 'e0', 'skip');
    expect(actionOf(next, 'e0')).toBe('skip');
    expect(EMPTY_CHOICES.action).toEqual({});
  });
  it('«Похожие — из библиотеки» трогает только упражнения с похожим', () => {
    const next = useAllSimilar(setAction(EMPTY_CHOICES, 'e0', 'skip'), list);
    expect(tally(list, next)).toEqual({ create: 24, use: 6, skip: 1 });
    expect(actionOf(next, 'e0')).toBe('skip');
  });
  it('«Создать все» сбрасывает действия, но не группы', () => {
    const c = createAll(setGroup(setAction(EMPTY_CHOICES, 'e1', 'skip'), 'e12', 'Пресс'));
    expect(c.action).toEqual({});
    expect(c.group.e12).toBe('Пресс');
  });
  it('текст итога пропускает нули', () => {
    expect(tallyText({ create: 25, use: 4, skip: 2 })).toBe('создать 25 · взять похожие 4 · не создавать 2');
    expect(tallyText({ create: 31, use: 0, skip: 0 })).toBe('создать 31');
    expect(footerText({ create: 25, use: 4, skip: 2 })).toBe('25 новых упражнений · 4 из библиотеки · 2 без упражнения');
    expect(footerText({ create: 1, use: 0, skip: 0 })).toBe('1 новое упражнение');
  });
});

describe('группа мышц', () => {
  const noGroup = list.find((e) => !e.muscles)!;
  it('просим только у создаваемого упражнения без группы', () => {
    expect(needsGroup(noGroup, EMPTY_CHOICES)).toBe(true);
    expect(needsGroup(noGroup, setAction(EMPTY_CHOICES, noGroup.key, 'skip'))).toBe(false);
    expect(needsGroup(list[0], EMPTY_CHOICES)).toBe(false);
  });
});

describe('фильтры и «Показать все»', () => {
  it('считают упражнения с похожим и без группы', () => {
    expect(filterCounts(list)).toEqual({ all: 31, similar: 6, nogroup: 4 });
  });
  it('без фильтра видно первые строки, с «Показать все» — все', () => {
    expect(visibleExercises(list, 'all', false)).toHaveLength(EXERCISES_LIMIT);
    expect(visibleExercises(list, 'all', true)).toHaveLength(31);
  });
  it('фильтр показывает всё найденное', () => {
    expect(visibleExercises(list, 'similar', false)).toHaveLength(6);
    expect(visibleExercises(list, 'nogroup', false).every((e) => !e.muscles)).toBe(true);
  });
});

describe('сравнение с прошлой неделей', () => {
  const at = (w: number, s: number) => weeks[w].sessions[s];
  it('у первой недели нет прошлой: всё новое', () => {
    expect(diffSession(previousSession(weeks, 0, 0), at(0, 0))).toEqual({ old: {}, changes: 0, fresh: true });
  });
  it('считает изменившиеся значения и запоминает старые', () => {
    const d = diffSession(previousSession(weeks, 1, 0), at(1, 0));
    expect(d.changes).toBe(3);
    expect(d.old['Обратные отжимания от лавочки']).toBe('18–20');
    expect(d.fresh).toBe(false);
  });
  it('новая связка — когда упражнений прошлой недели нет', () => {
    const d = diffSession(previousSession(weeks, 2, 0), at(2, 0));
    expect(d.fresh).toBe(true);
    expect(sessionChip(at(2, 0), d)).toEqual({ text: 'новая связка', tone: 'new' });
  });
  it('плашки: прошлое, изменения со склонением, без изменений', () => {
    expect(sessionChip(at(0, 0), diffSession(undefined, at(0, 0)))).toEqual({ text: 'в прошлом', tone: 'past' });
    expect(sessionChip(at(1, 0), diffSession(previousSession(weeks, 1, 0), at(1, 0))).text).toBe('↑ 3 изменения');
    expect(sessionChip(at(1, 1), diffSession(previousSession(weeks, 1, 1), at(1, 1))).text).toBe('↑ 1 изменение');
    const same = diffSession(at(8, 0), { ...at(8, 0), id: 'x' });
    expect(sessionChip(at(8, 0), same)).toEqual({ text: 'как на прошлой неделе', tone: 'same' });
  });
});

describe('убранные упражнения и первое появление', () => {
  it('пропущенное упражнение исчезает из тренировок', () => {
    const c = setAction(EMPTY_CHOICES, 'e2', 'skip'); // «Выпады на месте»
    const skipped = skippedNames(list, c);
    expect(sessionItems(weeks[0].sessions[0], skipped).map((i) => i.name)).not.toContain('Выпады на месте');
    expect(sessionItems(weeks[0].sessions[0], new Set())).toHaveLength(3);
  });
  it('находит первую неделю упражнения', () => {
    expect(firstUseWeek(weeks, 'Обратные отжимания от лавочки')).toBe(0);
    expect(firstUseWeek(weeks, 'Гоблет-присед')).toBe(6);
    expect(firstUseWeek(weeks, 'нет такого')).toBe(-1);
  });
  it('сводка недели', () => {
    expect(weekSummary(weeks[0])).toBe('Вт «Трицепс, пресс, ноги» · Чт «Грудь, кор, спина»');
  });
});
