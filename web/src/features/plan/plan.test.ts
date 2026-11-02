import { describe, expect, it } from 'vitest';
import type { PlanEntry } from '../../data/types';
import {
  applyMoves,
  calendarDays,
  canShift,
  cellAriaLabel,
  cellStatusWord,
  checkCopy,
  dayActions,
  displayStatus,
  emptyDayTexts,
  initialPlanState,
  planBounds,
  usedTemplates,
  inRange,
  longDate,
  planReducer,
  quickDates,
  rangeTitle,
  shiftAnchor,
  templateMeta,
  weekStart,
} from './plan';

const TODAY = '2026-10-31';
const MAX = '2026-12-31';

describe('даты', () => {
  it('неделя начинается с понедельника', () => {
    expect(weekStart('2026-10-31')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });
  it('длинная дата с днём недели', () => {
    expect(longDate('2026-10-31')).toBe('Суббота, 31 октября');
  });
});

describe('calendarDays', () => {
  it('месяц: полные недели с понедельника', () => {
    const days = calendarDays('month', '2026-10-15');
    expect(days).toHaveLength(35);
    expect(days[0]).toBe('2026-09-28');
    expect(days[34]).toBe('2026-11-01');
  });
  it('месяц на шесть недель', () => {
    expect(calendarDays('month', '2026-11-10')).toHaveLength(42);
    expect(calendarDays('month', '2026-08-10')).toHaveLength(42);
    expect(calendarDays('month', '2027-02-10')).toHaveLength(28);
  });
  it('неделя: семь дней', () => {
    expect(calendarDays('week', '2026-10-31')).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
  });
});

describe('inRange', () => {
  it('в месяце скрывает чужие дни и дни вне границ', () => {
    expect(inRange('2026-09-30', 'month', '2026-10-15', '2026-09-01', MAX)).toBe(false);
    expect(inRange('2026-10-01', 'month', '2026-10-15', '2026-09-01', MAX)).toBe(true);
    expect(inRange('2026-08-31', 'week', '2026-08-31', '2026-09-01', MAX)).toBe(false);
  });
  it('в неделе показывает дни соседнего месяца', () => {
    expect(inRange('2026-11-01', 'week', '2026-10-31', '2026-09-01', MAX)).toBe(true);
  });
});

describe('rangeTitle и шаги', () => {
  it('заголовок месяца и недели', () => {
    expect(rangeTitle('month', '2026-10-31')).toBe('Октябрь 2026');
    expect(rangeTitle('week', '2026-10-31')).toBe('26 октября – 1 ноября');
    expect(rangeTitle('week', '2026-11-04')).toBe('2 – 8 ноября');
  });
  it('шаг по месяцу уходит на первое число', () => {
    expect(shiftAnchor('month', '2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftAnchor('month', '2026-01-15', -1)).toBe('2025-12-01');
  });
  it('шаг по неделе — семь дней', () => {
    expect(shiftAnchor('week', '2026-10-31', 1)).toBe('2026-11-07');
  });
  it('нельзя выйти за границы календаря', () => {
    expect(canShift('month', '2026-09-10', -1, '2026-09-01', MAX)).toBe(false);
    expect(canShift('month', '2026-10-10', -1, '2026-09-01', MAX)).toBe(true);
    expect(canShift('month', '2026-12-10', 1, '2026-09-01', MAX)).toBe(false);
    expect(canShift('week', '2026-09-10', -1, '2026-09-01', MAX)).toBe(true);
    expect(canShift('week', '2026-09-03', -1, '2026-09-01', MAX)).toBe(false);
    expect(canShift('week', '2026-09-10', -1, '2026-09-08', MAX)).toBe(false);
    expect(canShift('week', '2026-12-28', 1, '2026-09-01', MAX)).toBe(false);
  });
});

describe('статусы', () => {
  const planned: PlanEntry = { templateId: 'legs', status: 'planned' };
  it('запланированная на сегодня становится «сегодня»', () => {
    expect(displayStatus(TODAY, planned, TODAY)).toBe('today');
    expect(displayStatus('2026-10-30', planned, TODAY)).toBe('skipped');
    expect(displayStatus('2026-11-01', planned, TODAY)).toBe('planned');
    expect(displayStatus('2026-10-30', { ...planned, status: 'done' }, TODAY)).toBe('done');
    expect(displayStatus(TODAY, { ...planned, status: 'done' }, TODAY)).toBe('done');
  });
  it('слово в клетке: пусто для запланированной', () => {
    expect(cellStatusWord('planned')).toBe('');
    expect(cellStatusWord('done')).toBe('✓ выполнена');
    expect(cellStatusWord('moved')).toBe('перенесена');
  });
  it('подпись клетки для скринридера', () => {
    expect(cellAriaLabel(TODAY, 'Ноги и ягодицы', 'today', false)).toBe('Суббота, 31 октября: Ноги и ягодицы, сегодня');
    expect(cellAriaLabel('2026-11-01', 'Всё тело', 'planned', false)).toBe('Воскресенье, 1 ноября: Всё тело');
    expect(cellAriaLabel(TODAY, null, null, false, true)).toBe('Суббота, 31 октября, сегодня: нет тренировки');
    expect(cellAriaLabel('2026-11-03', null, null, true)).toBe('Вторник, 3 ноября: нет тренировки, выбран для копии');
  });
});

describe('templateMeta', () => {
  const ex = (n: number) => Array.from({ length: n }, () => ({ name: 'x', detail: '' }));
  it('склоняет «упражнение»', () => {
    expect(templateMeta({ exercises: ex(1), minutes: 20 })).toBe('1 упражнение · ≈ 20 мин');
    expect(templateMeta({ exercises: ex(3), minutes: 40 })).toBe('3 упражнения · ≈ 40 мин');
    expect(templateMeta({ exercises: ex(6), minutes: 55 })).toBe('6 упражнений · ≈ 55 мин');
  });
});

describe('dayActions', () => {
  it('сегодня: начать, перенести, изменить', () => {
    expect(dayActions('today', false)).toEqual({ start: true, results: false, move: true, edit: true, remove: false });
  });
  it('выполненная: итоги; скопированная вручную — убрать', () => {
    expect(dayActions('done', false).results).toBe(true);
    expect(dayActions('done', true)).toMatchObject({ results: false, remove: true });
  });
  it('пропущенная и перенесённая без действий над тренировкой', () => {
    expect(dayActions('skipped', false)).toEqual({ start: false, results: false, move: false, edit: false, remove: false });
  });
});

describe('emptyDayTexts', () => {
  it('прошлое и будущее', () => {
    expect(emptyDayTexts('2026-10-20', TODAY)).toEqual({ title: 'Тренировки не было', create: 'Записать тренировку' });
    expect(emptyDayTexts('2026-11-03', TODAY).create).toBe('Создать тренировку');
  });
});

describe('quickDates', () => {
  const busy = new Set(['2026-11-01', '2026-11-02']);
  it('завтра, ближайший свободный, через неделю', () => {
    const q = quickDates('2026-10-31', TODAY, MAX, (d) => busy.has(d));
    expect(q.map((x) => [x.key, x.date])).toEqual([
      ['tomorrow', '2026-11-01'],
      ['free', '2026-11-03'],
      ['week', '2026-11-07'],
    ]);
  });
  it('одинаковые даты не повторяются, исходный день пропускается', () => {
    const q = quickDates('2026-11-01', TODAY, MAX, () => false);
    expect(q.map((x) => x.key)).toEqual(['free', 'week']);
    expect(q[0]!.date).toBe('2026-11-02');
  });
  it('через неделю не раньше завтрашнего дня', () => {
    expect(quickDates('2026-10-05', TODAY, MAX, () => false).find((x) => x.key === 'week')!.date).toBe('2026-11-02');
  });
});

describe('checkCopy', () => {
  const entries: Record<string, PlanEntry> = { '2026-11-01': { templateId: 'full', status: 'planned' } };
  const check = (target: string | null) =>
    checkCopy('2026-10-31', target, TODAY, MAX, (d) => entries[d], (id) => (id === 'full' ? 'Всё тело' : id));
  it('свободный день', () => {
    expect(check('2026-11-03')).toMatchObject({ valid: true, replaces: null, warning: '', label: 'Создать копию' });
    expect(check('2026-11-03').hint).toBe('Копия появится: вторник, 3 ноября.');
  });
  it('занятый день предупреждает о замене', () => {
    const r = check('2026-11-01');
    expect(r).toMatchObject({ valid: true, replaces: 'full', hint: '', label: 'Заменить копией' });
    expect(r.warning).toBe('На 1 ноября уже запланировано «Всё тело». Копия её заменит.');
  });
  it('тот же день, прошлое и пустая дата недопустимы', () => {
    expect(check('2026-10-31')).toMatchObject({ valid: false, hint: 'Это тот же день — выбери другую дату.' });
    expect(check('2026-10-20')).toMatchObject({ valid: false, hint: 'Выбери дату с 31 октября по 31 декабря.' });
    expect(check(null).valid).toBe(false);
    expect(check('2027-01-05').valid).toBe(false);
  });
});

describe('planReducer', () => {
  const start = initialPlanState(TODAY);
  it('начальное состояние: месяц с выбранным днём', () => {
    expect(start).toMatchObject({ view: 'month', anchor: TODAY, sel: TODAY, copyOpen: false, copyDate: null, notice: null });
  });
  it('смена вида переносит якорь на выбранный день', () => {
    const s = planReducer({ ...start, anchor: '2026-12-01', sel: '2026-10-27' }, { type: 'view', view: 'week' });
    expect(s).toMatchObject({ view: 'week', anchor: '2026-10-27' });
  });
  it('выбор дня закрывает копию и плашку', () => {
    const open = { ...start, copyOpen: true, copyDate: '2026-11-03', notice: { to: 'x', title: 'y' } };
    const s = planReducer(open, { type: 'pick', date: '2026-10-27', today: TODAY });
    expect(s).toMatchObject({ sel: '2026-10-27', copyOpen: false, copyDate: null, notice: null });
  });
  it('при открытой копии нажатие на будущий день выбирает дату копии', () => {
    const open = planReducer(start, { type: 'toggleCopy' });
    expect(planReducer(open, { type: 'pick', date: '2026-11-03', today: TODAY })).toMatchObject({
      sel: TODAY,
      copyOpen: true,
      copyDate: '2026-11-03',
    });
  });
  it('при открытой копии нажатие на прошлый день просто выбирает его', () => {
    const open = planReducer(start, { type: 'toggleCopy' });
    expect(planReducer(open, { type: 'pick', date: '2026-10-20', today: TODAY })).toMatchObject({ sel: '2026-10-20', copyOpen: false });
  });
  it('копирование показывает плашку, «Открыть день» переходит к копии', () => {
    const done = planReducer(planReducer(start, { type: 'toggleCopy' }), { type: 'copied', to: '2026-11-03', title: 'Ноги и ягодицы' });
    expect(done).toMatchObject({ copyOpen: false, notice: { to: '2026-11-03', title: 'Ноги и ягодицы' } });
    expect(planReducer(done, { type: 'openCopied' })).toMatchObject({ sel: '2026-11-03', anchor: '2026-11-03', notice: null });
  });
  it('«Сегодня» возвращает выбор и якорь', () => {
    const s = planReducer({ ...start, sel: '2026-12-01', anchor: '2026-12-01' }, { type: 'today', today: TODAY });
    expect(s).toMatchObject({ sel: TODAY, anchor: TODAY });
  });
});

describe('planBounds', () => {
  it('без записей: два месяца назад и два вперёд от сегодняшнего', () => {
    expect(planBounds('2026-11-02', [])).toEqual({ min: '2026-09-01', max: '2027-01-31' });
  });
  it('записи внутри границ их не меняют', () => {
    expect(planBounds('2026-11-02', ['2026-10-05', '2026-12-20'])).toEqual({ min: '2026-09-01', max: '2027-01-31' });
  });
  it('далёкая запись расширяет календарь до конца её месяца', () => {
    expect(planBounds('2026-11-02', ['2026-03-17', '2027-04-02'])).toEqual({ min: '2026-03-01', max: '2027-04-30' });
  });
  it('границы в январе переходят через год', () => {
    expect(planBounds('2027-01-10', [])).toEqual({ min: '2026-11-01', max: '2027-03-31' });
  });
});

describe('usedTemplates', () => {
  const t = (id: string) => ({ id, title: id, minutes: 30, tone: 'primary' as const, exercises: [] });
  const templates = [t('a'), t('b'), t('c')];
  const e = (templateId: string) => ({ templateId, status: 'planned' as const });
  it('только стоящие в показанных днях, по порядку появления, без повторов', () => {
    const entries = { '2026-11-02': e('c'), '2026-11-03': e('a'), '2026-11-04': e('c'), '2026-12-01': e('b') };
    expect(usedTemplates(templates, entries, ['2026-11-02', '2026-11-03', '2026-11-04']).map((x) => x.id)).toEqual(['c', 'a']);
  });
  it('пустые дни и неизвестные шаблоны пропускаются', () => {
    expect(usedTemplates(templates, { '2026-11-02': e('zzz') }, ['2026-11-01', '2026-11-02'])).toEqual([]);
  });
});

describe('applyMoves: перенос в календаре', () => {
  const planned = (id: string, over: Partial<PlanEntry> = {}): PlanEntry => ({ templateId: id, status: 'planned', custom: true, ...over });
  it('пустой исходный день становится «перенесена» с датой, новый день помнит откуда', () => {
    // 2026-11-04 — среда, 2026-11-06 — пятница
    const out = applyMoves({ '2026-11-06': planned('3') }, [{ templateId: '3', from: '2026-11-04', to: '2026-11-06' }]);
    expect(out['2026-11-04']).toEqual({ templateId: '3', status: 'moved', movedTo: '6 ноября' });
    expect(out['2026-11-06']).toEqual({ ...planned('3'), movedFrom: 'ср' });
  });
  it('исходный день занят другой тренировкой: её не затираем', () => {
    const entries = { '2026-11-04': planned('9'), '2026-11-06': planned('3') };
    const out = applyMoves(entries, [{ templateId: '3', from: '2026-11-04', to: '2026-11-06' }]);
    expect(out['2026-11-04']).toEqual(planned('9'));
    expect(out['2026-11-06']!.movedFrom).toBe('ср');
  });
  it('на новом дне главная тренировка другая: подпись «со дня» не вешаем', () => {
    const out = applyMoves({ '2026-11-06': planned('9', { more: ['Кардио'] }) }, [{ templateId: '3', from: '2026-11-04', to: '2026-11-06' }]);
    expect(out['2026-11-06']!.movedFrom).toBeUndefined();
  });
  it('исходный объект не меняется, без переносов возвращается как есть', () => {
    const entries = { '2026-11-06': planned('3') };
    const same = applyMoves(entries, []);
    expect(same).toBe(entries);
    applyMoves(entries, [{ templateId: '3', from: '2026-11-04', to: '2026-11-06' }]);
    expect(entries['2026-11-06']).toEqual(planned('3'));
  });
});
