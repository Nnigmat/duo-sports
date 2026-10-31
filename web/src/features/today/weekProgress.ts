import type { WeekDay } from '../../ui';

/** Сколько тренировок недели сделано из запланированных (отдых и перенесённые дни не считаются). */
export function weekProgress(days: WeekDay[]): { done: number; total: number } {
  const planned = days.filter((d) => d.status !== 'rest' && d.status !== 'moved');
  return { done: planned.filter((d) => d.status === 'done').length, total: planned.length };
}
