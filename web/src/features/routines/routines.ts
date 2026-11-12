import type { Role, RoutineDetail, RoutineInput, RoutineItem, RoutineKind, RoutineSummary } from '../../../../shared/types';

/** Пределы совпадают с серверными (server/routines.ts) */
export const LIMITS = { title: 80, note: 300, items: 30, sec: 3600 };

export const KIND_LABEL: Record<RoutineKind, { plural: string; one: string; newLabel: string }> = {
  warmup: { plural: 'Разминки', one: 'Разминка', newLabel: 'Новая разминка' },
  cooldown: { plural: 'Заминки', one: 'Заминка', newLabel: 'Новая заминка' },
};

export function canManageRoutines(role: Role | null | undefined): boolean {
  return role === 'trainer' || role === 'admin';
}

/** 270 → «4:30» */
export function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** «5 упр. · 4:30» */
export function metaText(r: Pick<RoutineSummary, 'itemCount' | 'totalSec'>): string {
  return `${r.itemCount} упр. · ${mmss(r.totalSec)}`;
}

/** «Используется в 3 тренировках» / «Не используется» */
export function usedText(usedIn: number): string {
  if (usedIn === 0) return 'Не используется';
  return `Используется в ${usedIn} ${plural(usedIn, 'тренировке', 'тренировках', 'тренировках')}`;
}

export function countWord(n: number): string {
  return plural(n, 'упражнение', 'упражнения', 'упражнений');
}

/** Диапазон секунд: «30 с» или «30–45 с» */
export function secText(sec: { min: number; max: number }): string {
  return sec.min === sec.max ? `${sec.max} с` : `${sec.min}–${sec.max} с`;
}

/** Время позиции с учётом сторон: «30 с × 2» */
export function itemTime(item: RoutineItem): string {
  return item.sides ? `${secText(item.sec)} × 2` : secText(item.sec);
}

export function totalSec(items: Array<{ sec: { max: number }; sides?: unknown }>): number {
  return items.reduce((sum, it) => sum + it.sec.max * (it.sides ? 2 : 1), 0);
}

export function searchRoutines<T extends { title: string }>(list: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return q ? list.filter((r) => r.title.toLowerCase().includes(q)) : list;
}

// ── Черновик формы ──────────────────────────────────────

export type DraftItem = {
  /** Ключ строки в списке: упражнение может стоять дважды */
  key: number;
  exercise: string;
  name: string;
  min: string;
  max: string;
  sides: boolean;
  sideA: string;
  sideB: string;
};

export type RoutineDraft = {
  kind: RoutineKind;
  title: string;
  note: string;
  items: DraftItem[];
};

let nextKey = 1;
export const newKey = () => nextKey++;

export function emptyDraft(kind: RoutineKind): RoutineDraft {
  return { kind, title: '', note: '', items: [] };
}

export function newItem(exercise: string, name: string): DraftItem {
  return { key: newKey(), exercise, name, min: '30', max: '30', sides: false, sideA: 'Левая', sideB: 'Правая' };
}

export function draftFromRoutine(r: RoutineDetail): RoutineDraft {
  return {
    kind: r.kind,
    title: r.title,
    note: r.note ?? '',
    items: r.items.map((it) => ({
      key: newKey(),
      exercise: it.exercise,
      name: it.name,
      min: String(it.sec.min),
      max: String(it.sec.max),
      sides: !!it.sides,
      sideA: it.sides?.[0] ?? 'Левая',
      sideB: it.sides?.[1] ?? 'Правая',
    })),
  };
}

const isSec = (s: string) => /^\d+$/.test(s.trim()) && Number(s) >= 1 && Number(s) <= LIMITS.sec;

/** Текст ошибки строки или null */
export function itemError(it: DraftItem): string | null {
  if (!isSec(it.min) || !isSec(it.max)) return `Секунды: целое число от 1 до ${LIMITS.sec}`;
  if (Number(it.min) > Number(it.max)) return 'Начало диапазона больше конца';
  if (it.sides && (!it.sideA.trim() || !it.sideB.trim())) return 'Назовите обе стороны';
  return null;
}

/** Что мешает сохранить; пусто — можно */
export function problems(d: RoutineDraft): string[] {
  const out: string[] = [];
  if (!d.title.trim()) out.push('Введите название');
  else if (d.title.trim().length > LIMITS.title) out.push(`Название не длиннее ${LIMITS.title} знаков`);
  if (d.note.trim().length > LIMITS.note) out.push(`Пояснение не длиннее ${LIMITS.note} знаков`);
  if (d.items.length === 0) out.push('Добавьте хотя бы одно упражнение');
  if (d.items.length > LIMITS.items) out.push(`Упражнений не больше ${LIMITS.items}`);
  if (d.items.some((it) => itemError(it))) out.push('Исправьте секунды в упражнениях');
  return out;
}

export function toInput(d: RoutineDraft): RoutineInput {
  const note = d.note.trim();
  return {
    kind: d.kind,
    title: d.title.trim(),
    ...(note ? { note } : {}),
    items: d.items.map((it) => ({
      exercise: it.exercise,
      sec: { min: Number(it.min), max: Number(it.max) },
      ...(it.sides ? { sides: [it.sideA.trim(), it.sideB.trim()] as [string, string] } : {}),
    })),
  };
}

/** Сумма по черновику; строки с неверными секундами не считаются */
export function draftTotal(d: RoutineDraft): number {
  return d.items.reduce((sum, it) => (isSec(it.max) ? sum + Number(it.max) * (it.sides ? 2 : 1) : sum), 0);
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}
