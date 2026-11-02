import type { AthleteSessionsResponse, Block, TrainerHistoryItem, TrainerPlanItem } from '../../../../shared/types';
import { parseIso } from '../plan/plan';
import { formatPlan } from '../workout/flow/format';
import { MONTHS, plural } from '../workout/flow/ru';
import { formatMinutes, formatVolume } from '../../shared/format';
import type { NewComment } from './api';

const NB = '\u00a0';
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Что выбрано в карточке ученика: выполненная тренировка или запланированная */
export type Selection = { kind: 'session'; sessionId: number } | { kind: 'plan'; date: string; workoutId: number };

export const sameSelection = (a: Selection | null, b: Selection | null): boolean =>
  !!a && !!b && (a.kind === 'session' ? b.kind === 'session' && a.sessionId === b.sessionId : b.kind === 'plan' && a.date === b.date && a.workoutId === b.workoutId);

/** Открываем то, что ждёт разбора; иначе свежую выполненную; иначе ближайшую запланированную */
export function defaultSelection(s: AthleteSessionsResponse): Selection | null {
  const waiting = s.history.find((h) => h.reviewedAt === null);
  const item = waiting ?? s.history[0];
  if (item) return { kind: 'session', sessionId: item.sessionId };
  const plan = s.planned.find((p) => p.kind === 'planned');
  return plan ? { kind: 'plan', date: plan.date, workoutId: plan.workoutId } : null;
}

/** «Пт, 6 ноября» */
const dayLabel = (iso: string): string => {
  const d = parseIso(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** «Сегодня · Пн, 2 ноября», «Вс, 1 ноября · вчера», «Чт, 5 ноября» */
export function rowDate(iso: string, today: string): string {
  const diff = Math.round((parseIso(iso).getTime() - parseIso(today).getTime()) / 86_400_000);
  if (diff === 0) return `Сегодня · ${dayLabel(iso)}`;
  if (diff === -1) return `${dayLabel(iso)} · вчера`;
  if (diff === 1) return `${dayLabel(iso)} · завтра`;
  return dayLabel(iso);
}

/** «46 мин · 4 380 кг · 20 подходов · 2 видео» */
export function historyMeta(h: TrainerHistoryItem): string {
  return [
    h.durationSec ? formatMinutes(Math.round(h.durationSec / 60)) : null,
    h.volumeKg > 0 ? formatVolume(h.volumeKg) : null,
    h.setsDone > 0 ? `${h.setsDone}${NB}${plural(h.setsDone, ['подход', 'подхода', 'подходов'])}` : null,
    h.videos > 0 ? `${h.videos}${NB}видео` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export const historyBadge = (h: TrainerHistoryItem): 'review' | 'reviewed' => (h.reviewedAt ? 'reviewed' : 'review');

export const plannedBadge = (p: TrainerPlanItem, today: string): 'today' | 'planned' => (p.date === today ? 'today' : 'planned');

/** «Перенесена на пт, 6 ноября» / «Перенесена с ср, 4 ноября»; null — не переносилась */
export function movedText(p: { movedFrom?: string; movedTo?: string }): string | null {
  if (p.movedTo) return `Перенесена на ${lower(dayLabel(p.movedTo))}`;
  if (p.movedFrom) return `Перенесена с ${lower(dayLabel(p.movedFrom))}`;
  return null;
}

export const plannedMeta = (p: TrainerPlanItem): string => `${p.exerciseCount}${NB}${plural(p.exerciseCount, ['упражнение', 'упражнения', 'упражнений'])}`;

/** Имя без фамилии: «Никита Н.» → «Никита» */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || 'Ученик';

type LibraryName = { id: string; name: string; aliases: string[] };

/** slug упражнения из библиотеки по названию в тренировке; null — в библиотеке такого нет */
export function findSlug(name: string, library: LibraryName[]): string | null {
  const key = name.trim().toLowerCase();
  const hit = library.find((e) => e.name.trim().toLowerCase() === key || e.aliases.some((a) => a.trim().toLowerCase() === key));
  return hit?.id ?? null;
}

/**
 * Тело POST /api/athletes/:id/comments. К моменту видео, если он прикреплён; иначе к упражнению из библиотеки;
 * упражнения нет в библиотеке — к его видео, а без видео ко всей тренировке.
 */
export function buildCommentRequest(a: { text: string; sessionId: number; slug: string | null; videoId: string | null; attachedSec: number | null }): NewComment {
  const text = a.text.trim();
  if (a.attachedSec !== null && a.videoId) return { text, videoId: a.videoId, timecodeSec: a.attachedSec };
  if (a.slug) return { text, sessionId: a.sessionId, exerciseId: a.slug };
  if (a.videoId) return { text, videoId: a.videoId };
  return { text, sessionId: a.sessionId };
}

export type PlanStep = { key: string; name: string; sets: string[] };

/** Шаги запланированной тренировки: подходы по блокам (timed — один, sets — по числу подходов, circuit — по числу кругов) */
export function planSteps(blocks: Block[]): PlanStep[] {
  return blocks.flatMap((b) =>
    b.exercises.map((e) => {
      const count = b.mode === 'sets' ? (e as { sets: number }).sets : b.mode === 'circuit' ? b.rounds : 1;
      return { key: e.id, name: e.name, sets: Array.from({ length: count }, () => formatPlan(e.kind, { target: e.target, weight: e.weight })) };
    }),
  );
}
