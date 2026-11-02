import { describe, expect, it } from 'vitest';
import { addedList, ADDED_LIMIT, clockTime, buildNotices, datesText, doneSummary, doneTexts, skippedDates, undoneNote, undoText } from './done';
import { newExercisesFixture as list, planSourceFixture } from './fixtures';
import { buildPlan, DEFAULT_OPTIONS } from './importPlan';
import { EMPTY_CHOICES, setAction, useAllSimilar } from './preview';

const plan = buildPlan(planSourceFixture, DEFAULT_OPTIONS);

describe('datesText', () => {
  it('один месяц — месяц один раз в конце', () => {
    expect(datesText(['2026-10-27', '2026-10-29'])).toBe('27 и 29 октября');
    expect(datesText(['2026-10-27'])).toBe('27 октября');
    expect(datesText(['2026-10-26', '2026-10-27', '2026-10-29'])).toBe('26, 27 и 29 октября');
  });
  it('разные месяцы — у каждой даты свой', () => {
    expect(datesText(['2026-10-30', '2026-11-02'])).toBe('30 октября и 2 ноября');
  });
});

describe('addedList', () => {
  it('по умолчанию создаём всё: у каждого есть мышцы и видео в подписи', () => {
    const added = addedList(list, EMPTY_CHOICES);
    expect(added).toHaveLength(31);
    expect(added[0]).toEqual({ title: 'Обратные отжимания от лавочки', meta: 'трицепс · видео', chip: 'Создано' });
    expect(added.find((a) => a.title === 'Складочка')!.meta).toBe('группа мышц не указана');
  });
  it('группа, выбранная на проверке, попадает в подпись', () => {
    const c = { ...EMPTY_CHOICES, group: { e12: 'Пресс' } };
    expect(addedList(list, c).find((a) => a.title === 'Комплекс на пресс')!.meta).toBe('пресс · видео');
  });
  it('«Похожее» заменяется упражнением библиотеки, «не создавать» пропадает, повторы схлопываются', () => {
    let c = useAllSimilar(EMPTY_CHOICES, list);
    c = setAction(c, 'e0', 'skip');
    const added = addedList(list, c);
    expect(added.find((a) => a.title === 'Обратные отжимания от лавочки')).toBeUndefined();
    expect(added.filter((a) => a.chip === 'Из библиотеки').map((a) => a.title)).toContain('Ягодичный мост');
    expect(new Set(added.map((a) => a.title)).size).toBe(added.length);
    expect(ADDED_LIMIT).toBe(7);
  });
});

describe('buildNotices', () => {
  it('прошлые дни, замены и упражнения без видео', () => {
    const n = buildNotices(plan, list, EMPTY_CHOICES);
    expect(skippedDates(plan)).toEqual(['2026-10-27', '2026-10-29']);
    expect(n.map((x) => x.title)).toEqual(['2 тренировки пропущены', '2 тренировки заменены', '4 упражнения без видео']);
    expect(n[0].text).toBe('27 и 29 октября уже прошли — в календарь не добавлены, шаблоны сохранены');
    expect(n[1].text).toBe('«Всё тело» 5 нояб и «Верх тела A» 10 нояб — как вы выбрали на шаге «План»');
    expect(n[2].text).toBe('Боковая планка, Складочка и ещё 2 — видео можно добавить во вкладке «Упражнения»');
  });
  it('без причин замечаний список пуст', () => {
    const clean = buildPlan(planSourceFixture, { ...DEFAULT_OPTIONS, past: 'shift', resolutions: { '2026-11-05': 'keep', '2026-11-10': 'both' } });
    const allSkipped = list.reduce((c, e) => (e.hasVideo ? c : setAction(c, e.key, 'skip')), EMPTY_CHOICES);
    expect(buildNotices(clean, list, allSkipped)).toEqual([]);
  });
});

describe('тексты шапки', () => {
  it('импорт выполнен: диапазон плана и время', () => {
    expect(doneTexts(false, '14:20', plan)).toEqual({
      eyebrow: 'Сегодня в 14:20',
      heading: 'Импорт завершён',
      lead: 'План в календаре с 3 ноября по 21 января. Новые упражнения — во вкладке «Упражнения».',
      againLabel: 'Импортировать ещё',
    });
  });
  it('отменён', () => {
    const t = doneTexts(true, '14:20', plan);
    expect(t.heading).toBe('Всё как было');
    expect(t.againLabel).toBe('Вставить снова');
  });
  it('итоги и отмена', () => {
    const s = doneSummary(list, EMPTY_CHOICES, plan, 26);
    expect(s).toEqual({ workouts: 26, inCalendar: 24, created: 31, weeks: 13 });
    expect(undoneNote(s, ['Всё тело', 'Верх тела A'])).toBe('Удалено 26 тренировок и 31 упражнение, «Всё тело» и «Верх тела A» вернулись в план.');
    expect(undoneNote({ ...s, created: 0 }, [])).toBe('Удалено 26 тренировок.');
    expect(undoText('14:20')).toBe('Вернём тренировки, упражнения и план к состоянию до 14:20. Отменить можно в течение 24 часов.');
  });
});

describe('clockTime', () => {
  it('часы и минуты', () => {
    expect(clockTime('2026-11-02T14:20:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});
