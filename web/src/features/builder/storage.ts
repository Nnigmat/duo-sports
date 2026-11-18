import type { BuilderDraft, BuilderInput, RoutineChoice, RoutinePick } from './types';

/** Версия записи: форма BuilderDraft изменилась — старая запись сбрасывается, как битый JSON */
export const BUILDER_VERSION = 2;

/** Ввод и собранный черновик живут в браузере до «Сохранить»: перезагрузка, закрытая вкладка или вебвью их не теряют. */
export interface StoredBuilder {
  v: typeof BUILDER_VERSION;
  savedAt: number;
  step: 'input' | 'review';
  input: BuilderInput;
  draft: BuilderDraft | null;
}

export const BUILDER_TTL_MS = 7 * 24 * 3600 * 1000;

/** Ключ по пользователю, ученику (или своему плану) и дате: черновики разных дней и учеников не смешиваются */
export const builderKey = (userId: number, athleteId: number | null, date: string) => `duo-builder:${userId}:${athleteId ?? 'own'}:${date}`;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrs = (v: unknown) => Array.isArray(v) && v.every(isStr);

const isChoice = (c: unknown): c is RoutineChoice =>
  isObj(c) && (c.kind === 'none' || (c.kind === 'library' && isStr(c.slug)) || (c.kind === 'text' && isStr(c.text)));

const isInput = (i: unknown): i is BuilderInput =>
  isObj(i) && isStr(i.title) && isChoice(i.warmup) && isChoice(i.cooldown) && isObj(i.main) && isStr(i.main.text) && isStrs(i.main.picked);

const isPick = (p: unknown): p is RoutinePick =>
  isObj(p) &&
  (p.kind === 'none' ||
    (p.kind === 'library' && isStr(p.slug)) ||
    (p.kind === 'new' && isStr(p.title) && Array.isArray(p.items) && p.items.every((i) => isObj(i) && isStr(i.name) && typeof i.sec === 'number')));

const isBlock = (b: unknown) => isObj(b) && isStr(b.id) && isStr(b.mode) && Array.isArray(b.exercises) && b.exercises.every((e) => isObj(e) && isStr(e.name));

const isDraft = (d: unknown): d is BuilderDraft =>
  isObj(d) && isStr(d.date) && isStr(d.title) && Array.isArray(d.blocks) && d.blocks.every(isBlock) &&
  Array.isArray(d.newExercises) && d.newExercises.every((e) => isObj(e) && isStr(e.name) && isStr(e.slug) && isStrs(e.muscles) && isStr(e.kind)) &&
  isPick(d.warmup) && isPick(d.cooldown) && Array.isArray(d.advice) && d.advice.every((a) => isObj(a) && isStr(a.id) && isStr(a.text)) &&
  isObj(d.marks) && Object.values(d.marks).every((m) => isObj(m) && isStr(m.field) && isStr(m.wrote) && isStr(m.message)) &&
  Array.isArray(d.unparsed) && d.unparsed.every((u) => isObj(u) && isStr(u.what) && isStr(u.message));

/** Чистая функция: чужая версия, просрочка, битый JSON или не та форма — null */
export function parseBuilder(raw: string | null, now: number): StoredBuilder | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v) || v.v !== BUILDER_VERSION || typeof v.savedAt !== 'number' || now - v.savedAt > BUILDER_TTL_MS) return null;
  if (v.step !== 'input' && v.step !== 'review') return null;
  if (!isInput(v.input)) return null;
  if (v.draft !== null && !isDraft(v.draft)) return null;
  if (v.step === 'review' && v.draft === null) return null;
  return { v: BUILDER_VERSION, savedAt: v.savedAt, step: v.step, input: v.input, draft: v.draft as BuilderDraft | null };
}

export const serializeBuilder = (s: StoredBuilder): string => JSON.stringify(s);

/** Хранилище недоступно — страница просто работает без восстановления. Негодная запись удаляется. */
export function loadBuilder(key: string, now = Date.now()): StoredBuilder | null {
  try {
    const raw = localStorage.getItem(key);
    const s = parseBuilder(raw, now);
    if (raw && !s) localStorage.removeItem(key);
    return s;
  } catch {
    return null;
  }
}

export function saveBuilder(key: string, s: StoredBuilder): void {
  try {
    localStorage.setItem(key, serializeBuilder(s));
  } catch {
    // переполнено или недоступно — сборка работает и без черновика
  }
}

export function clearBuilder(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // см. выше
  }
}
