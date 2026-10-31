import { describe, expect, it } from 'vitest';
import { inWeekday, rescheduleNote } from './reschedule';

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
