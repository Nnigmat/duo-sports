import { describe, expect, it } from 'vitest';
import { inWeekday, rescheduleNote, weekTargets } from './reschedule';

describe('inWeekday', () => {
  it('«во вторник», не «в вторник»', () => {
    expect(inWeekday('вт')).toBe('во вторник');
    expect(inWeekday('вс')).toBe('в воскресенье');
  });
});

describe('rescheduleNote', () => {
  it('внутри недели с занятым днём: две тренировки, серия сохраняется', () => {
    expect(rescheduleNote({ weekday: 'вс', busy: 'Всё тело' }, true)).toEqual({
      tone: 'info',
      text: 'В воскресенье уже «Всё тело»: будет две тренировки в один день. Серия «Без пропусков» сохранится.',
    });
  });
  it('внутри недели в свободный день', () => {
    expect(rescheduleNote({ weekday: 'пт' }, true)).toEqual({ tone: 'info', text: 'Серия «Без пропусков» сохранится.' });
  });
  it('на следующую неделю серия прерывается', () => {
    const n = rescheduleNote({ weekday: 'ср', busy: 'Кардио и пресс' }, false);
    expect(n.tone).toBe('warn');
    expect(n.text).toBe(
      'Серия «Без пропусков» прервётся: план этой недели останется невыполненным. В этот день уже «Кардио и пресс».',
    );
  });
});

describe('weekTargets', () => {
  it('семь дней с понедельника, прошлые недоступны, занятые подписаны', () => {
    const days = weekTargets('2026-11-02', { '2026-11-04': 'Кардио' }, '2026-11-03');
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: '2026-11-02', weekday: 'пн', day: '2', disabled: true });
    expect(days[1]!.disabled).toBe(false);
    expect(days[2]).toEqual({ date: '2026-11-04', weekday: 'ср', day: '4', busy: 'Кардио', disabled: false });
    expect(days[6]!.date).toBe('2026-11-08');
  });
});
