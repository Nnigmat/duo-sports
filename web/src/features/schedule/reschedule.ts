import { addDays, parseIso, weekdayShort } from '../plan/plan';

export type RescheduleNote = { tone: 'info' | 'warn'; text: string };

const IN_WEEKDAY: Record<string, string> = {
  пн: 'в понедельник',
  вт: 'во вторник',
  ср: 'в среду',
  чт: 'в четверг',
  пт: 'в пятницу',
  сб: 'в субботу',
  вс: 'в воскресенье',
};

/** «вс» → «в воскресенье» */
export function inWeekday(weekday: string): string {
  return IN_WEEKDAY[weekday] ?? weekday;
}

/**
 * Что будет с серией «Без пропусков» при переносе.
 * Внутри недели серия сохраняется, на следующую неделю — прерывается.
 */
export function rescheduleNote(target: { weekday: string; busy?: string }, sameWeek: boolean): RescheduleNote {
  if (sameWeek) {
    const text = target.busy
      ? `${capitalize(inWeekday(target.weekday))} уже «${target.busy}»: будет две тренировки в один день. Серия «Без пропусков» сохранится.`
      : 'Серия «Без пропусков» сохранится.';
    return { tone: 'info', text };
  }
  const busy = target.busy ? ` В этот день уже «${target.busy}».` : '';
  return { tone: 'warn', text: `Серия «Без пропусков» прервётся: план этой недели останется невыполненным.${busy}` };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type WeekTarget = { date: string; weekday: string; day: string; busy?: string; disabled: boolean };

/** Семь дней недели с понедельника start; дни раньше today недоступны */
export function weekTargets(start: string, busy: Record<string, string>, today: string): WeekTarget[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, weekday: weekdayShort(date), day: String(parseIso(date).getDate()), ...(busy[date] && { busy: busy[date] }), disabled: date < today };
  });
}
