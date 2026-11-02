/** Чистая логика плеера разбора: время, перемотка, скорость, активный комментарий. */

export interface PlayerComment {
  id: string;
  /** Секунда видео */
  timecodeSec: number;
  text: string;
  /** Подпись автора для зрителя: «Тренер» или «Ты» */
  author: string;
}

/** Сколько секунд после метки комментарий висит поверх видео */
export const ACTIVE_WINDOW_SEC = 6;

export const SPEEDS = [1, 0.5, 0.25] as const;
export type Speed = (typeof SPEEDS)[number];

/** 21 → «0:21», 65 → «1:05» */
export function formatTime(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Новая позиция после перемотки на delta секунд, в пределах видео */
export function clampSeek(current: number, delta: number, duration: number): number {
  return Math.min(Math.max(current + delta, 0), Math.max(duration, 0));
}

/** 1× → 0,5× → 0,25× → 1× */
export function nextSpeed(rate: number): Speed {
  const i = SPEEDS.indexOf(rate as Speed);
  return SPEEDS[(i + 1) % SPEEDS.length];
}

export function speedLabel(rate: number): string {
  return `${String(rate).replace('.', ',')}×`;
}

function sorted(comments: PlayerComment[]): PlayerComment[] {
  return [...comments].sort((a, b) => a.timecodeSec - b.timecodeSec);
}

/** Комментарий, который показан поверх видео в момент t: метка включена, через 6 с исчезает */
export function activeComment(comments: PlayerComment[], t: number): PlayerComment | null {
  let found: PlayerComment | null = null;
  for (const c of sorted(comments)) {
    if (c.timecodeSec <= t && t - c.timecodeSec < ACTIVE_WINDOW_SEC) found = c;
  }
  return found;
}

export interface PrevNext {
  prev: string | null;
  next: string | null;
  /** «2 из 3»: номер активного, а между окнами число пройденных меток; 0 до первой */
  position: number;
  total: number;
}

export function prevNext(comments: PlayerComment[], t: number): PrevNext {
  const list = sorted(comments);
  const active = activeComment(list, t);
  const activeIdx = active ? list.indexOf(active) : -1;
  let prevIdx = -1;
  list.forEach((c, i) => {
    if (c.timecodeSec < t) prevIdx = i;
  });
  if (activeIdx >= 0) prevIdx = activeIdx - 1;
  const nextIdx = list.findIndex((c) => c.timecodeSec > t);
  const passed = list.filter((c) => c.timecodeSec <= t).length;
  return {
    prev: prevIdx >= 0 ? list[prevIdx].id : null,
    next: nextIdx >= 0 ? list[nextIdx].id : null,
    position: activeIdx >= 0 ? activeIdx + 1 : passed,
    total: list.length,
  };
}
