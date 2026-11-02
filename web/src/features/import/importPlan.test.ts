import { describe, expect, it } from 'vitest';
import { planSourceFixture as src } from './fixtures';
import {
  buildPlan, calendarNote, commonChoice, dayLabel, DEFAULT_OPTIONS, planCta, planFooter, planSummary, resolveAll, setPast, type PlanOptions,
} from './importPlan';

const opts = (o: Partial<PlanOptions> = {}): PlanOptions => ({ ...DEFAULT_OPTIONS, ...o });
const cellAt = (r: ReturnType<typeof buildPlan>, date: string) => r.weeks.flat().find((c) => c.date === date)!;

describe('buildPlan: прошлые дни', () => {
  it('по умолчанию неделя в прошлом пропускается', () => {
    const r = buildPlan(src, opts());
    expect(r.skipped).toBe(2);
    expect(r.inCalendar).toBe(24);
    expect(r.first).toBe('2026-11-03');
    expect(r.last).toBe('2027-01-21');
    expect(r.weeks).toHaveLength(13);
    expect(cellAt(r, '2026-10-27')).toMatchObject({ kind: 'skipped', title: 'пропущена', strike: 'Трицепс, пресс, ноги' });
  });
  it('«Сдвинуть» переносит весь план на неделю', () => {
    const r = buildPlan(src, opts({ past: 'shift' }));
    expect(r.skipped).toBe(0);
    expect(r.inCalendar).toBe(26);
    expect(r.first).toBe('2026-11-03');
    expect(r.last).toBe('2027-01-28');
    expect(r.weeks).toHaveLength(14);
  });
  it('«Отметить пропущенными» оставляет прошлые дни в календаре с пометкой', () => {
    const r = buildPlan(src, opts({ past: 'missed' }));
    expect(r.skipped).toBe(0);
    expect(r.inCalendar).toBe(26);
    expect(cellAt(r, '2026-10-27').title).toBe('Трицепс, пресс, ноги · пропущена');
    expect(r.first).toBe('2026-10-27');
  });
});

describe('buildPlan: конфликты', () => {
  it('находит дни, где уже стоит своя тренировка', () => {
    const r = buildPlan(src, opts());
    expect(r.conflicts.map((c) => [c.date, c.mine, c.choice])).toEqual([
      ['2026-11-05', 'Всё тело', 'replace'],
      ['2026-11-10', 'Верх тела A', 'replace'],
    ]);
  });
  it('«Заменить»: в дне тренировка из файла, моя зачёркнута', () => {
    expect(cellAt(buildPlan(src, opts()), '2026-11-05')).toMatchObject({ kind: 'conflict', title: 'Грудь, кор, спина', strike: 'Всё тело' });
  });
  it('«Оставить обе»: две тренировки в дне, обе в календаре', () => {
    const r = buildPlan(src, opts({ resolutions: { '2026-11-05': 'both' } }));
    expect(cellAt(r, '2026-11-05')).toMatchObject({ title: 'Всё тело', second: 'Грудь, кор, спина' });
    expect(r.inCalendar).toBe(24);
  });
  it('«Оставить мою»: из файла в этот день ничего, счётчик уменьшается', () => {
    const r = buildPlan(src, opts({ resolutions: { '2026-11-05': 'keep' } }));
    expect(cellAt(r, '2026-11-05')).toMatchObject({ title: 'Всё тело', strike: 'Грудь, кор, спина' });
    expect(r.inCalendar).toBe(23);
  });
  it('свои тренировки без конфликта остаются как есть', () => {
    expect(cellAt(buildPlan(src, opts()), '2026-11-07')).toMatchObject({ kind: 'mine', title: 'Ноги и ягодицы' });
  });
  it('«Для всех» — общий выбор или null; resolveAll ставит один выбор всем', () => {
    const r = buildPlan(src, opts());
    expect(commonChoice(r.conflicts)).toBe('replace');
    expect(commonChoice([])).toBeNull();
    const mixed = buildPlan(src, opts({ resolutions: { '2026-11-05': 'keep' } }));
    expect(commonChoice(mixed.conflicts)).toBeNull();
    expect(resolveAll(r.conflicts, 'both')).toEqual({ '2026-11-05': 'both', '2026-11-10': 'both' });
  });
  it('смена режима прошлых дней сбрасывает решения', () => {
    expect(setPast(opts({ resolutions: { '2026-11-05': 'keep' } }), 'shift').resolutions).toEqual({});
    const r = buildPlan(src, opts({ past: 'shift' }));
    expect(r.conflicts.map((c) => c.date)).toEqual(['2026-11-05', '2026-11-10']);
  });
});

describe('план выключен', () => {
  it('в календаре только свои тренировки, конфликтов нет', () => {
    const r = buildPlan(src, opts({ planOn: false }));
    expect(r.conflicts).toEqual([]);
    expect(r.inCalendar).toBe(0);
    expect(r.first).toBeNull();
    expect(cellAt(r, '2026-11-05')).toMatchObject({ kind: 'mine', title: 'Всё тело' });
  });
});

describe('тексты', () => {
  it('подпись даты и сводка', () => {
    expect(dayLabel('2026-11-03')).toBe('3 нояб');
    expect(dayLabel('2027-01-21')).toBe('21 янв');
    expect(planSummary(buildPlan(src, opts()), true)).toBe('24 тренировки в календаре · 3 нояб — 21 янв');
    expect(planSummary(buildPlan(src, opts({ planOn: false })), false)).toMatch(/без дат/);
  });
  it('подпись календаря', () => {
    expect(calendarNote('skip', '2026-11-03')).toBe('Первая неделя пропускается, план идёт с 3 ноября');
    expect(calendarNote('shift', '2026-11-03')).toBe('Все даты сдвинуты на 7 дней вперёд — первая тренировка вторник, 3 ноября');
    expect(calendarNote('missed', null)).toBe('Первая неделя попадёт в историю как пропущенная');
  });
  it('итог и кнопка', () => {
    expect(planFooter(26, buildPlan(src, opts()), true)).toBe('26 тренировок · в календаре 24 · 2 пропущено');
    expect(planFooter(26, buildPlan(src, opts({ planOn: false })), false)).toBe('26 тренировок · без дат');
    expect(planCta(true)).toBe('Импортировать и добавить в план');
    expect(planCta(false)).toBe('Импортировать без плана');
  });
});
