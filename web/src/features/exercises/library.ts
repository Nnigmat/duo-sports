import type { ExerciseInput, ExerciseKind, Role } from '../../../../shared/types';
import { formatElapsed } from '../workout/flow/elapsed';
import { plural } from '../workout/flow/ru';
import type { IconName } from '../../ui';
import type {
  ExerciseDefaults,
  ExerciseDraft,
  ExerciseSession,
  LibraryExercise,
  MuscleGroupId,
  SetResult,
} from './types';

/** Чистая логика вкладки «Упражнения»: подписи, поиск, группировка, черновики формы. Без DOM. */

const NBSP = ' ';

export const GROUPS: Array<{ id: MuscleGroupId; name: string; short: string }> = [
  { id: 'legs', name: 'Ноги и ягодицы', short: 'Ноги' },
  { id: 'back', name: 'Спина', short: 'Спина' },
  { id: 'chest', name: 'Грудь и плечи', short: 'Грудь и плечи' },
  { id: 'arms', name: 'Руки', short: 'Руки' },
  { id: 'core', name: 'Пресс', short: 'Пресс' },
  { id: 'cardio', name: 'Кардио', short: 'Кардио' },
  { id: 'other', name: 'Другие', short: 'Другие' },
];

export const MUSCLE_OPTIONS = [
  'Квадрицепс', 'Ягодицы', 'Бицепс бедра', 'Икры', 'Широчайшие', 'Ромбовидные', 'Спина', 'Грудь',
  'Дельты', 'Бицепс', 'Трицепс', 'Пресс', 'Кор', 'Ноги', 'Всё тело', 'Выносливость',
];

export const EQUIPMENT_OPTIONS = ['Штанга', 'Гантель', '2 гантели', 'Гиря', 'Тренажёр', 'Турник', 'Скакалка', 'Скамья', 'Коврик', 'Брусья', 'Упоры для отжиманий'];

const MUSCLE_GROUP: Record<string, MuscleGroupId> = {
  Квадрицепс: 'legs', Ягодицы: 'legs', 'Бицепс бедра': 'legs', Икры: 'legs', Ноги: 'legs',
  Широчайшие: 'back', Ромбовидные: 'back', Спина: 'back',
  Грудь: 'chest', Дельты: 'chest',
  Бицепс: 'arms', Трицепс: 'arms',
  Пресс: 'core', Кор: 'core',
  'Всё тело': 'cardio', Выносливость: 'cardio',
};

export const KIND_INFO: Record<ExerciseKind, { name: string; hint: string; icon: IconName }> = {
  weight: { name: 'Вес × повторы', hint: 'Записываем вес и повторы', icon: 'barbell' },
  reps: { name: 'Собственный вес', hint: 'Записываем только повторы', icon: 'body' },
  time: { name: 'На время', hint: 'Записываем время подхода', icon: 'timer' },
};
export const KINDS: ExerciseKind[] = ['weight', 'reps', 'time'];

const EQUIPMENT_ICON: Record<string, IconName> = {
  Штанга: 'barbell', Гантели: 'dumbbell', Гантель: 'dumbbell', '2 гантели': 'dumbbell', Гиря: 'kettlebell',
  Тренажёр: 'machine', Турник: 'body', Скакалка: 'rope',
};

/** Иконка плитки в списке: время — таймер, иначе по первому снаряду с иконкой */
export function exerciseIcon(kind: ExerciseKind, equipment: string[]): IconName {
  if (kind === 'time') return 'timer';
  return equipment.map((e) => EQUIPMENT_ICON[e]).find(Boolean) ?? 'body';
}

/** Инвентарь строкой: «Штанга, Скамья»; пусто — «Без снаряда» */
export const equipmentLabel = (equipment: string[]): string => equipment.join(', ') || 'Без снаряда';

// ── Подписи ──────────────────────────────────────────────

function num(v: number): string {
  return String(v).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** formatKg(14, true) → «2 × 14 кг» */
export function formatKg(v: number, pair = false): string {
  return `${pair ? `2${NBSP}×${NBSP}` : ''}${num(v)}${NBSP}кг`;
}

/** «1 повтор», «5 повторов» */
export function formatReps(n: number): string {
  return `${n}${NBSP}${plural(n, ['повтор', 'повтора', 'повторов'])}`;
}

/** 90 → «1:30» */
export function formatTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function workoutsWord(n: number): string {
  return plural(n, ['тренировка', 'тренировки', 'тренировок']);
}

export function setText(kind: ExerciseKind, s: SetResult, pair = false): string {
  if (kind === 'weight') return `${formatKg(s.weight ?? 0, pair)}${NBSP}×${NBSP}${s.reps ?? 0}`;
  if (kind === 'reps') return formatReps(s.reps ?? 0);
  return formatTime(s.seconds ?? 0);
}

/** Текст рекорда или пустая строка, если упражнение не выполнялось */
export function recordText(ex: LibraryExercise): string {
  return ex.record ? setText(ex.kind, ex.record, ex.pair) : '';
}

export function totalText(count: number, inPlan: number): string {
  return `${count} ${plural(count, ['упражнение', 'упражнения', 'упражнений'])} · ${inPlan} в плане`;
}

// ── Список ───────────────────────────────────────────────

export function matchesQuery(ex: LibraryExercise, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${ex.name} ${ex.muscles.join(' ')} ${ex.equipment}`.toLowerCase().includes(needle);
}

export function searchExercises(list: LibraryExercise[], query: string): LibraryExercise[] {
  return list.filter((ex) => matchesQuery(ex, query));
}

export type GroupFilter = MuscleGroupId | 'all';

/** Разделы списка в порядке GROUPS; пустые пропускаются. group ограничивает одним разделом. */
export function groupExercises(
  list: LibraryExercise[],
  group: GroupFilter = 'all',
): Array<{ id: MuscleGroupId; name: string; items: LibraryExercise[] }> {
  return GROUPS.filter((g) => group === 'all' || g.id === group)
    .map((g) => ({ id: g.id, name: g.name, items: list.filter((ex) => ex.group === g.id) }))
    .filter((g) => g.items.length > 0);
}

/** Фильтры над списком: «Все» и группы, в которых что-то есть (поиск уже применён к list) */
export function groupTabs(list: Array<{ group: MuscleGroupId }>): Array<{ id: GroupFilter; name: string; count: number }> {
  const tabs = GROUPS.map((g) => ({ id: g.id as GroupFilter, name: g.short, count: list.filter((e) => e.group === g.id).length }));
  return [{ id: 'all', name: 'Все', count: list.length }, ...tabs.filter((t) => t.id !== 'other' || t.count > 0)];
}

/** «В плане · Сб» — из «Сб, 31 окт · Ноги и ягодицы» */
export function planShort(plan: string): string {
  return `В плане · ${plan.split(',')[0]}`;
}

// ── Карточка ─────────────────────────────────────────────

export interface Tile {
  value: string;
  label: string;
  /** На всю ширину */
  wide?: boolean;
}

const sum = (a: number[]) => a.reduce((p, c) => p + c, 0);

export function recordTiles(ex: LibraryExercise): Tile[] {
  if (!ex.record || ex.sessionsTotal === 0) return [];
  const last = ex.sessions[0]?.sets ?? [];
  const total: Tile = { value: String(ex.sessionsTotal), label: `${workoutsWord(ex.sessionsTotal)} всего` };
  if (ex.kind === 'weight') return [{ value: recordText(ex), label: `рекорд · ${ex.record.date}` }, total];
  if (ex.kind === 'reps') {
    return [
      { value: recordText(ex), label: `рекорд в подходе · ${ex.record.date}`, wide: true },
      { value: formatReps(sum(last.map((s) => s.reps ?? 0))), label: 'за последнюю тренировку' },
      total,
    ];
  }
  return [
    { value: recordText(ex), label: `рекорд · ${ex.record.date}`, wide: true },
    { value: formatTime(sum(last.map((s) => s.seconds ?? 0))), label: 'за последнюю тренировку' },
    total,
  ];
}

export interface SetRow {
  n: number;
  text: string;
  /** 0–100: доля от рекорда; нет — полоски нет (вес × повторы) */
  bar?: number;
  isRecord: boolean;
}

function isRecordSet(ex: LibraryExercise, s: SetResult): boolean {
  const r = ex.record;
  if (!r) return false;
  if (ex.kind === 'weight') return s.weight === r.weight && (s.reps ?? 0) >= (r.reps ?? 0);
  if (ex.kind === 'reps') return (s.reps ?? 0) >= (r.reps ?? 0);
  return (s.seconds ?? 0) >= (r.seconds ?? 0);
}

/** Подходы последней тренировки; «рекорд» только если рекорд поставлен именно в ней */
export function lastSessionRows(ex: LibraryExercise): SetRow[] {
  const session = ex.sessions[0];
  if (!session) return [];
  return session.sets.map((s, i) => {
    const row: SetRow = { n: i + 1, text: setText(ex.kind, s, ex.pair), isRecord: !!session.isRecord && isRecordSet(ex, s) };
    if (ex.kind === 'reps' && ex.record?.reps) row.bar = Math.min(100, ((s.reps ?? 0) / ex.record.reps) * 100);
    if (ex.kind === 'time' && ex.record?.seconds) row.bar = Math.min(100, ((s.seconds ?? 0) / ex.record.seconds) * 100);
    return row;
  });
}

/** Пояснение к полоскам под подходами */
export function barsNote(ex: LibraryExercise): string {
  if (ex.kind === 'weight' || !ex.record) return '';
  return `Полоска — от вашего рекорда, ${recordText(ex)}.`;
}

export function trendTitle(kind: ExerciseKind): string {
  return kind === 'weight' ? 'Рабочий вес' : kind === 'reps' ? 'Повторов в лучшем подходе' : 'Время лучшего подхода';
}

function trendValue(ex: LibraryExercise, v: number): string {
  return ex.kind === 'weight' ? formatKg(v, ex.pair) : ex.kind === 'reps' ? formatReps(v) : formatTime(v);
}

export function trendInfo(ex: LibraryExercise) {
  const t = ex.trend;
  const first = t.length ? trendValue(ex, t[0]) : '';
  const last = t.length ? trendValue(ex, t[t.length - 1]) : '';
  return {
    title: trendTitle(ex.kind),
    first,
    last,
    aria: t.length ? `${trendTitle(ex.kind)} за ${t.length} ${workoutsWord(t.length)}: от ${first} до ${last}` : '',
    caption: `${t.length} ${workoutsWord(t.length)}`,
  };
}

/** Последнее видео и последний комментарий среди загруженных тренировок */
export function latestMedia(ex: LibraryExercise) {
  const withVideo = ex.sessions.find((s) => s.videos.length > 0);
  const withComment = ex.sessions.find((s) => s.comments.length > 0);
  return {
    video: withVideo ? { date: withVideo.date, ...withVideo.videos[0] } : undefined,
    comment: withComment ? { date: withComment.date, ...withComment.comments[0] } : undefined,
    videoCount: sum(ex.sessions.map((s) => s.videos.length)),
    commentCount: sum(ex.sessions.map((s) => s.comments.length)),
  };
}

/** «2 видео · 3 комментария» */
export function mediaCountText(videos: number, comments: number): string {
  const parts: string[] = [];
  if (videos) parts.push(`${videos} видео`);
  if (comments) parts.push(`${comments} ${plural(comments, ['комментарий', 'комментария', 'комментариев'])}`);
  return parts.join(' · ');
}

// ── История ──────────────────────────────────────────────

export type HistorySort = 'new' | 'old';

export function sortSessions(sessions: ExerciseSession[], sort: HistorySort): ExerciseSession[] {
  return sort === 'new' ? sessions : [...sessions].reverse();
}

export function sessionSummary(kind: ExerciseKind, sets: SetResult[]): string {
  if (kind === 'weight') return `${sets.length} ${plural(sets.length, ['подход', 'подхода', 'подходов'])}`;
  if (kind === 'reps') return `всего ${formatReps(sum(sets.map((s) => s.reps ?? 0)))}`;
  return `всего ${formatTime(sum(sets.map((s) => s.seconds ?? 0)))}`;
}

/** Время подхода: до минуты «45 с», дальше мм:сс */
export function setTimeText(sec: number): string {
  return sec < 60 ? `${sec}${NBSP}с` : formatElapsed(sec);
}

/** «Подход обычно 45 с»; пустая строка, если типичного времени нет */
export function typicalSetText(ex: LibraryExercise): string {
  return ex.typicalSetSec === undefined ? '' : `Подход обычно ${setTimeText(ex.typicalSetSec)}`;
}

/** «на упражнение ушло 03:20»; пустая строка, если время известно не у всех подходов */
export function sessionTimeText(s: ExerciseSession): string {
  return s.totalSec === undefined ? '' : `на упражнение ушло ${formatElapsed(s.totalSec)}`;
}

export function historySubtitle(ex: LibraryExercise): string {
  return `${ex.name} · ${ex.sessionsTotal} ${workoutsWord(ex.sessionsTotal)}`;
}

/** Сколько тренировок не загружено в список */
export function hiddenSessions(ex: LibraryExercise): number {
  return Math.max(0, ex.sessionsTotal - ex.sessions.length);
}

// ── Форма ────────────────────────────────────────────────

export const DEFAULT_PARAMS: ExerciseDefaults = { reps: 10, weight: 20, seconds: 30 };

export interface ParamField {
  key: keyof ExerciseDefaults;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  mode: 'number' | 'duration';
}

export function paramFields(kind: ExerciseKind): ParamField[] {
  if (kind === 'weight') {
    return [
      { key: 'reps', label: 'Повторы', unit: 'повт.', step: 1, min: 1, max: 100, mode: 'number' },
      { key: 'weight', label: 'Вес', unit: 'кг', step: 2.5, min: 0, max: 500, mode: 'number' },
    ];
  }
  if (kind === 'reps') return [{ key: 'reps', label: 'Повторы', unit: 'повт.', step: 1, min: 1, max: 200, mode: 'number' }];
  return [{ key: 'seconds', label: 'Время подхода', unit: 'мин:с', step: 15, min: 5, max: 1800, mode: 'duration' }];
}

export function emptyDraft(): ExerciseDraft {
  return { name: '', kind: 'weight', muscles: [], equipment: [], notes: '', params: { ...DEFAULT_PARAMS } };
}

export function draftFromExercise(ex: LibraryExercise): ExerciseDraft {
  return { name: ex.name, kind: ex.kind, muscles: [...ex.muscles], equipment: [...ex.equipment], notes: ex.notes ?? '', params: { ...ex.defaults } };
}

export function canSubmit(draft: ExerciseDraft): boolean {
  return draft.name.trim().length > 0;
}

/** По первой выбранной мышце */
export function groupForMuscles(muscles: string[]): MuscleGroupId {
  return (muscles[0] && MUSCLE_GROUP[muscles[0]]) || 'other';
}

export function groupHint(muscles: string[]): string {
  if (muscles.length === 0) return 'По первой выбранной мышце упражнение попадёт в нужный раздел списка.';
  const group = GROUPS.find((g) => g.id === groupForMuscles(muscles));
  return `В списке упражнение окажется в разделе «${group?.name}».`;
}

export function toggleItem(items: string[], item: string): string[] {
  return items.includes(item) ? items.filter((i) => i !== item) : [...items, item];
}

/** Применяет черновик к существующему упражнению; история и группа не меняются */
export function applyDraft(ex: LibraryExercise, draft: ExerciseDraft): LibraryExercise {
  return {
    ...ex,
    name: draft.name.trim() || ex.name,
    kind: draft.kind,
    muscles: draft.muscles.length ? draft.muscles : ex.muscles,
    equipment: draft.equipment,
    notes: draft.notes.trim() || undefined,
    defaults: { ...draft.params },
  };
}

export function createExercise(draft: ExerciseDraft, id: string): LibraryExercise {
  return {
    id,
    name: draft.name.trim(),
    kind: draft.kind,
    group: groupForMuscles(draft.muscles),
    muscles: draft.muscles.length ? draft.muscles : ['Всё тело'],
    equipment: draft.equipment,
    notes: draft.notes.trim() || undefined,
    defaults: { ...draft.params },
    sessionsTotal: 0,
    sessions: [],
    trend: [],
  };
}

// ── Права и запись на сервер ─────────────────────────────

/** Библиотеку меняют тренер и админ; спортсмен только читает */
export function canManageExercises(role: Role | null | undefined): boolean {
  return role === 'trainer' || role === 'admin';
}

/** Шаги «Как выполнять»: непустые строки без пробелов по краям */
export function noteSteps(notes: string | undefined): string[] {
  return (notes ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Тело POST: полное упражнение. Раздел берётся по первой мышце. */
export function toExerciseInput(draft: ExerciseDraft): ExerciseInput {
  return {
    name: draft.name.trim(),
    group: groupForMuscles(draft.muscles),
    kind: draft.kind,
    muscles: draft.muscles.length ? draft.muscles : ['Всё тело'],
    aliases: [],
    equipment: draft.equipment,
    notes: draft.notes.trim(),
  };
}

/** Тело PATCH: раздел и мышцы уходят, только если мышцы поменяли; псевдонимы не трогаем */
export function toExercisePatch(draft: ExerciseDraft, ex: LibraryExercise): Partial<ExerciseInput> {
  const { aliases: _aliases, ...input } = toExerciseInput(draft);
  const patch: Partial<ExerciseInput> = { ...input, name: input.name || ex.name };
  if (draft.muscles.length === 0 || draft.muscles.join('|') === ex.muscles.join('|')) {
    delete patch.muscles;
    delete patch.group;
  }
  return patch;
}
