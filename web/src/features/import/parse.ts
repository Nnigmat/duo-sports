import type { Block } from '../../../../shared/types';
import { LineCounter, parseDocument, type Document } from 'yaml';
import type { LibraryEntry } from '../../../../shared/types';
import { addDays, parseIso, weekStart } from '../plan/plan';
import { plural } from '../workout/flow/ru';
import { buildBlocks, usesDistance, type Load, type RawBlock, type RawExercise } from './structure';
import type { PlanSource, PlanWorkout } from './importPlan';
import { dayLabel } from './importPlan';
import type { Measure, NewExercise, PreviewBlock, PreviewData, PreviewItem, PreviewSession, PreviewWeek } from './types';
import {
  formatDistance, formatDuration, formatReps, formatWeight, parseDistance, parseDo, parseDuration, parseReps, parseWeight,
  type Reps, type WeightUnit,
} from './units';

/** Разбор YAML-текста импорта: текст → данные для шагов «Проверка» и «План». Чистая функция, без обращений к сети. */

export interface ParseContext {
  /** Библиотека упражнений: по ней находим упражнения по name, exercise_id и aliases */
  library: LibraryEntry[];
  /** Сегодня, «2026-11-02»: даты раньше считаются прошедшими */
  today: string;
  /** Тренировки, уже стоящие в плане: дата → название */
  mine: Record<string, string>;
}

export interface ParseIssue {
  message: string;
  /** Как исправить */
  hint?: string;
  /** Строка в тексте, с 1 */
  line?: number;
}

export type ParseResult =
  | { ok: true; preview: PreviewData; plan: PlanSource; workouts: ParsedWorkout[]; warnings: ParseIssue[] }
  | { ok: false; errors: ParseIssue[] };

/** Тренировка файла целиком: её записываем в базу; PlanWorkout.ref указывает на номер в этом списке */
export interface ParsedWorkout {
  /** id из файла: по нему повторный импорт обновит тренировку */
  slug?: string;
  title: string;
  blocks: PreviewBlock[];
  /** Те же блоки для экрана тренировки: подходы, круги, отдых */
  structure: Block[];
}

/** Удачный разбор */
export type ParsedImport = Extract<ParseResult, { ok: true }>;

export const MAX_CHARS = 1024 * 1024;
export const MAX_WORKOUTS = 500;

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const BLOCK_TYPES = ['sets', 'circuit', 'superset', 'warmup', 'cooldown', 'timed'] as const;
const TOP_KEYS = new Set(['version', 'units', 'exercises', 'routines', 'workouts', 'plan']);

type Json = unknown;
type Path = Array<string | number>;
type Obj = Record<string, Json>;

const isObj = (v: Json): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: Json): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;

interface Def {
  id: string;
  name: string;
  muscles: string[];
  aliases: string[];
  video?: string;
  measure: Measure;
  notes?: string;
}

interface Used {
  name: string;
  /** Номера тренировок, где упражнение стоит */
  workouts: Set<number>;
  hasVideo: boolean;
  muscles: string;
  similar?: string;
  candidates: string[];
  slug?: string;
  aliases: string[];
  measure: Measure;
  video?: string;
  notes?: string;
}

interface Occurrence {
  date: string;
  /** Номер тренировки в файле */
  index: number;
}

/** Похожее упражнение библиотеки: все слова её названия есть в новом, а новое длиннее («Планка» ⊂ «Боковая планка») */
export function similarTo(name: string, library: LibraryEntry[]): string | undefined {
  const words = (s: string) => new Set(norm(s).split(/[^a-zа-я0-9]+/).filter(Boolean));
  const mine = words(name);
  return library.find((l) => {
    const theirs = words(l.name);
    return theirs.size > 0 && theirs.size < mine.size && [...theirs].every((w) => mine.has(w));
  })?.name;
}

const CANDIDATES_MAX = 3;
const TYPO_RATIO = 0.7;

/** Расстояние Левенштейна: сколько букв заменить, вставить или убрать, чтобы получить одну строку из другой */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * Упражнения библиотеки, которые человек мог иметь в виду: опечатка («Подтягиваня»), более короткое или более длинное название
 * («Планка» ↔ «Боковая планка»). Самые похожие первыми, не больше трёх.
 */
export function candidatesFor(name: string, library: LibraryEntry[]): string[] {
  const words = (s: string) => new Set(norm(s).split(/[^a-zа-я0-9]+/).filter(Boolean));
  const mine = words(name);
  const mineText = norm(name);
  const within = (a: Set<string>, b: Set<string>) => a.size > 0 && [...a].every((w) => b.has(w));
  const scored = library.flatMap((l) => {
    const theirs = words(l.name);
    // Все слова одного названия есть в другом: ближе всего «Планка» к «Боковой планке»
    let score = within(theirs, mine) || within(mine, theirs) ? 0.9 : 0;
    for (const label of [l.name, ...l.aliases]) {
      const a = norm(label);
      score = Math.max(score, 1 - editDistance(mineText, a) / Math.max(mineText.length, a.length, 1));
    }
    return score >= TYPO_RATIO && norm(l.name) !== mineText ? [{ name: l.name, score }] : [];
  });
  return scored.sort((x, y) => y.score - x.score).slice(0, CANDIDATES_MAX).map((c) => c.name);
}

/** Красивое сообщение об ошибке самого YAML: отступы, табы, повторы ключей */
function yamlIssue(e: { code: string; message: string; linePos?: Array<{ line: number }> }): ParseIssue {
  const line = e.linePos?.[0]?.line;
  const at = line ? ` в строке ${line}` : '';
  switch (e.code) {
    case 'TAB_AS_INDENT':
      return { line, message: `Таб вместо пробелов${at}`, hint: 'Отступ — 2 пробела, без табов.' };
    case 'DUPLICATE_KEY':
      return { line, message: `Поле повторяется${at}`, hint: 'Каждое поле в блоке можно написать один раз.' };
    case 'BAD_INDENT':
    case 'BLOCK_AS_IMPLICIT_KEY':
    case 'MULTILINE_IMPLICIT_KEY':
    case 'BLOCK_IN_FLOW':
    case 'MISSING_CHAR':
      return { line, message: `Неверный отступ${at}`, hint: 'YAML чувствителен к пробелам: отступ — 2 пробела, без табов. Проверьте и двоеточия после ключей.' };
    default:
      return { line, message: `Не получилось прочитать YAML${at}`, hint: e.message.split('\n')[0] };
  }
}

export function parseImport(text: string, ctx: ParseContext): ParseResult {
  if (!text.trim()) return { ok: false, errors: [{ message: 'Вставьте текст в формате YAML' }] };
  if (text.length > MAX_CHARS) return { ok: false, errors: [{ message: 'Текст больше 1 МБ', hint: 'Разбейте его на несколько частей и импортируйте по очереди.' }] };

  const lines = new LineCounter();
  const doc: Document = parseDocument(text, { lineCounter: lines, uniqueKeys: true });
  if (doc.errors.length) return { ok: false, errors: doc.errors.map(yamlIssue) };

  const errors: ParseIssue[] = [];
  const warnings: ParseIssue[] = [];
  /** Строка узла по пути; без узла — строка родителя */
  const lineAt = (path: Path): number | undefined => {
    for (let n = path.length; n >= 0; n--) {
      const node = doc.getIn(path.slice(0, n), true) as { range?: [number, number, number] } | undefined;
      if (node?.range) return lines.linePos(node.range[0]).line;
    }
    return undefined;
  };
  const fail = (path: Path, message: string, hint?: string) => errors.push({ message, hint, line: lineAt(path) });
  const warn = (path: Path, message: string, hint?: string) => warnings.push({ message, hint, line: lineAt(path) });

  /** Отдых в секундах; диапазон — верхняя граница */
  const restSec = (v: Json, path: Path): number | undefined => {
    if (v === undefined) return undefined;
    const t = parseDuration(v);
    if (!t) return void fail(path, `Не понимаю время отдыха: ${String(v)}`, 'Пишите 90, 90s или 1:30.');
    return t.max;
  };

  const root = doc.toJS() as Json;
  if (!isObj(root)) return { ok: false, errors: [{ message: 'В начале файла ждём поля: version и workouts', hint: 'Смотрите пример на странице «Формат».' }] };

  if (root.version !== 1) fail(['version'], 'Нужно version: 1', 'Это версия формата, сейчас она всегда 1.');
  for (const k of Object.keys(root)) if (!TOP_KEYS.has(k)) warn([k], `Незнакомое поле: ${k}`, 'Оно будет пропущено.');

  const unit: WeightUnit = root.units === 'lb' ? 'lb' : 'kg';
  if (root.units !== undefined && root.units !== 'kg' && root.units !== 'lb') fail(['units'], 'units должно быть kg или lb');

  // ── Новые упражнения из exercises ───────────────────────
  const defs = new Map<string, Def>();
  if (root.exercises !== undefined) {
    if (!Array.isArray(root.exercises)) fail(['exercises'], 'exercises должно быть списком');
    else
      root.exercises.forEach((e: Json, i: number) => {
        const p: Path = ['exercises', i];
        if (!isObj(e)) return fail(p, 'Упражнение должно быть набором полей: id, name');
        const id = str(e.id);
        const name = str(e.name);
        if (!id) return fail(p, 'У нового упражнения нет id', 'id — латиница, цифры и дефис; по нему тренировки ссылаются через exercise_id.');
        if (!name) return fail(p, `У упражнения ${id} нет name`);
        if (defs.has(id)) return fail([...p, 'id'], `id повторяется: ${id}`, 'У каждого упражнения свой id.');
        const measure = e.measure ?? 'reps';
        if (!['weight', 'reps', 'time', 'distance'].includes(String(measure))) fail([...p, 'measure'], `Неизвестный measure: ${String(measure)}`, 'Допустимо: weight, reps, time, distance.');
        const muscles = Array.isArray(e.muscles) ? e.muscles.map(str).filter((m): m is string => !!m) : [];
        const aliases = Array.isArray(e.aliases) ? e.aliases.map(str).filter((m): m is string => !!m) : [];
        defs.set(id, { id, name, muscles, aliases, video: str(e.video) ?? undefined, measure: String(measure) as Measure, notes: str(e.notes) ?? undefined });
      });
  }

  // ── Поиск в библиотеке ──────────────────────────────────
  const libById = new Map(ctx.library.map((l) => [l.id, l]));
  const libByName = new Map<string, LibraryEntry>();
  for (const l of ctx.library) for (const n of [l.name, ...(l.aliases ?? [])]) libByName.set(norm(n), l);
  const defByName = new Map<string, Def>();
  for (const d of defs.values()) for (const n of [d.name, ...d.aliases]) defByName.set(norm(n), d);

  const used = new Map<string, Used>();
  /** «Номер тренировки» у упражнений набора: они разбираются один раз, настоящие номера добавляются по ссылке */
  const IN_ROUTINE = -1;
  const foundLib = new Set<string>();

  /** Имя для показа или null, если упражнение не нашлось (ошибка уже записана) */
  const resolve = (ex: Obj, path: Path, workout: number, timeOnly = workout === IN_ROUTINE): string | null => {
    let lib: LibraryEntry | undefined;
    let def: Def | undefined;
    let name: string | null = null;
    const id = str(ex.exercise_id);
    if (id) {
      def = defs.get(id);
      lib = def ? libByName.get(norm(def.name)) : libById.get(id);
      if (!def && !lib) {
        fail([...path, 'exercise_id'], `Неизвестный exercise_id: ${id}`, 'Исправьте опечатку или опишите упражнение в exercises.');
        return null;
      }
      name = def?.name ?? null;
    } else {
      name = str(ex.name);
      if (!name) {
        fail(path, 'У упражнения нет name или exercise_id');
        return null;
      }
      lib = libByName.get(norm(name));
      def = lib ? undefined : defByName.get(norm(name));
    }
    if (lib) {
      foundLib.add(lib.id);
      return lib.name;
    }
    const shown = name ?? '';
    // Для набора «похожее» ищем только среди упражнений на время: иначе замена обойдёт проверку типа
    const pool = timeOnly ? ctx.library.filter((l) => l.kind === 'time') : ctx.library;
    const entry = used.get(norm(shown)) ?? {
      name: shown,
      workouts: new Set<number>(),
      hasVideo: !!def?.video,
      muscles: def?.muscles.join(', ') ?? '',
      similar: similarTo(shown, pool),
      candidates: candidatesFor(shown, pool),
      slug: def?.id,
      aliases: def?.aliases ?? [],
      measure: def?.measure ?? inferMeasure(ex),
      video: def?.video,
      notes: def?.notes,
    };
    entry.workouts.add(workout);
    used.set(norm(shown), entry);
    return shown;
  };

  // ── Нагрузка упражнения ─────────────────────────────────
  const valueText = (ex: Obj, path: Path, withSets: boolean): { text: string; load: Load } | null => {
    const parts: string[] = [];
    const load: Load = {};
    let main: string | null = null;
    let sets: number | null = null;
    let weightText: string | null = null;

    if (ex.do !== undefined) {
      const short = parseDo(ex.do, unit);
      if (!short) {
        fail([...path, 'do'], `Не понимаю запись do: ${String(ex.do)}`, 'Пишите так: "4x8 @ 75", "3x12" или "3x8-12 @ 60".');
        return null;
      }
      sets = short.sets;
      main = formatReps(short.reps);
      load.sets = short.sets;
      load.reps = short.reps;
      if (short.weight) {
        weightText = formatWeight(short.weight);
        load.weight = short.weight;
      }
    } else if (Array.isArray(ex.sets)) {
      const rows: string[] = [];
      load.setList = [];
      for (const [i, s] of ex.sets.entries()) {
        const sp: Path = [...path, 'sets', i];
        if (!isObj(s)) {
          fail(sp, 'Подход должен быть набором полей: reps, weight');
          return null;
        }
        const reps = parseReps(s.reps);
        if (!reps) {
          fail([...sp, 'reps'], 'reps должно быть числом или диапазоном', 'Пишите 10 или "8-12" — без слов и единиц.');
          return null;
        }
        const w = s.weight === undefined ? null : parseWeight(s.weight, unit);
        if (s.weight !== undefined && !w) {
          fail([...sp, 'weight'], `Не понимаю вес: ${String(s.weight)}`, 'Пишите 75, 75kg или 165lb.');
          return null;
        }
        rows.push(`${formatReps(reps)}${w ? ` × ${formatWeight(w)}` : ''}${s.warmup === true ? ' (разминка)' : ''}`);
        load.setList.push({ reps, ...(w ? { weight: w } : {}), ...(s.warmup === true ? { warmup: true } : {}) });
      }
      if (!rows.length) {
        fail([...path, 'sets'], 'sets пустой', 'Добавьте хотя бы один подход.');
        return null;
      }
      return { text: rows.join(', '), load };
    } else {
      if (ex.sets !== undefined) {
        const n = Number(ex.sets);
        if (!Number.isInteger(n) || n < 1) {
          fail([...path, 'sets'], 'sets должно быть числом подходов или списком');
          return null;
        }
        sets = n;
        load.sets = n;
      }
      if (ex.reps !== undefined) {
        const reps: Reps | null = parseReps(ex.reps);
        if (!reps) {
          fail([...path, 'reps'], 'reps должно быть числом или диапазоном', 'Пишите 10 или "8-12" — без слов и единиц.');
          return null;
        }
        main = formatReps(reps);
        load.reps = reps;
      } else if (ex.time !== undefined) {
        const t = parseDuration(ex.time);
        if (!t) {
          fail([...path, 'time'], `Не понимаю время: ${String(ex.time)}`, 'Пишите 45, 45s, 1:30 или 2m.');
          return null;
        }
        main = formatDuration(t);
        load.time = t;
      } else if (ex.distance !== undefined) {
        const d = parseDistance(ex.distance);
        if (!d) {
          fail([...path, 'distance'], `Не понимаю расстояние: ${String(ex.distance)}`, 'Пишите 500m, 2km или 1.5mi.');
          return null;
        }
        main = formatDistance(d);
        load.distance = d;
      }
      if (ex.weight !== undefined) {
        const w = parseWeight(ex.weight, unit);
        if (!w) {
          fail([...path, 'weight'], `Не понимаю вес: ${String(ex.weight)}`, 'Пишите 75, 75kg или 165lb.');
          return null;
        }
        weightText = formatWeight(w);
        load.weight = w;
      }
    }

    if (!main) {
      fail(path, 'У упражнения нет нагрузки', 'Добавьте do, reps, time или distance.');
      return null;
    }
    parts.push(withSets && sets && sets > 1 ? `${sets} × ${main}` : main);
    if (weightText) parts.push(weightText);
    if (ex.per_side === true) parts.push('на сторону');
    return { text: parts.join(' · '), load };
  };

  // ── Наборы разминки и заминки ───────────────────────────
  /** Набор, как он стоит в тренировке: упражнения для структуры, строки для проверки, общее время обеих сторон */
  interface Routine {
    exercises: RawExercise[];
    items: PreviewItem[];
    totalSec: number;
  }
  const routineList = new Map<string, Routine>();
  /** Упражнения на время: в наборе и прямо в блоке разминки или заминки. owner — номер тренировки или IN_ROUTINE. */
  const readTimed = (list: Json[], path: Path, owner: number, where: 'набора' | 'блока'): Routine => {
    const exercises: RawExercise[] = [];
    const items: PreviewItem[] = [];
    let totalSec = 0;
    list.forEach((e: Json, ei: number) => {
      const ep: Path = [...path, ei];
      if (!isObj(e)) return fail(ep, 'Упражнение должно быть набором полей: name, time');
      const name = resolve(e, ep, owner, true);
      let time = null;
      if (e.time === undefined) fail(ep, `У упражнения ${where} нет time`, 'Время обязательно: time: 30s.');
      else {
        time = parseDuration(e.time);
        if (!time) fail([...ep, 'time'], `Не понимаю время: ${String(e.time)}`, 'Пишите 45, 45s, 1:30 или 2m.');
        else if (time.max <= 0) {
          fail([...ep, 'time'], 'time должно быть больше нуля', 'Упражнение идёт хотя бы секунду: 30s.');
          time = null;
        }
      }
      let sides: [string, string] | undefined;
      if (e.sides !== undefined) {
        const pair = Array.isArray(e.sides) && e.sides.length === 2 ? e.sides.map(str) : null;
        if (pair?.every((s): s is string => !!s)) sides = [pair[0]!, pair[1]!];
        else fail([...ep, 'sides'], 'sides — две подписи сторон', 'Пишите так: sides: [вправо, влево].');
      } else if (e.per_side === true) sides = ['вправо', 'влево'];
      if (!name) return;
      const lib = libByName.get(norm(name));
      const measure = lib ? lib.kind : defByName.get(norm(name))?.measure;
      if (measure && measure !== 'time') fail(ep, `«${name}» — не упражнение на время`, 'В разминке и заминке нужны упражнения с измерением time.');
      if (!time) return;
      exercises.push({ name, load: { time }, ...(sides ? { sides } : {}) });
      items.push({ name, value: `${formatDuration(time)}${sides ? ' · на сторону' : ''}` });
      totalSec += time.max * (sides ? 2 : 1);
    });
    return { exercises, items, totalSec };
  };

  if (root.routines !== undefined) {
    if (!Array.isArray(root.routines)) fail(['routines'], 'routines должно быть списком');
    else
      root.routines.forEach((r: Json, ri: number) => {
        const p: Path = ['routines', ri];
        if (!isObj(r)) return fail(p, 'Набор должен быть набором полей: id, title, exercises');
        const id = str(r.id);
        if (!id) return fail(p, 'У набора нет id', 'id — латиница, цифры и дефис; по нему блок разминки ссылается через routine.');
        if (!/^[A-Za-z0-9-]+$/.test(id)) fail([...p, 'id'], `id только из латиницы, цифр и дефиса: ${id}`);
        if (routineList.has(id)) return fail([...p, 'id'], `id набора повторяется: ${id}`, 'У каждого набора свой id.');
        routineList.set(id, { exercises: [], items: [], totalSec: 0 });
        if (!Array.isArray(r.exercises) || r.exercises.length === 0) return fail([...p, 'exercises'], 'В наборе нет exercises', 'Добавьте хотя бы одно упражнение.');
        routineList.set(id, readTimed(r.exercises, [...p, 'exercises'], IN_ROUTINE, 'набора'));
      });
  }

  // ── Тренировки ──────────────────────────────────────────
  interface Built {
    id?: string;
    title: string;
    date?: string;
    blocks: PreviewBlock[];
    structure: Block[];
  }
  const built: Built[] = [];
  const ids = new Map<string, number>();

  if (!Array.isArray(root.workouts) || root.workouts.length === 0) {
    fail(['workouts'], 'Нужна хотя бы одна тренировка в workouts');
  } else if (root.workouts.length > MAX_WORKOUTS) {
    fail(['workouts'], `Тренировок больше ${MAX_WORKOUTS}`, 'Разбейте текст на несколько частей.');
  } else {
    root.workouts.forEach((w: Json, wi: number) => {
      const p: Path = ['workouts', wi];
      if (!isObj(w)) return fail(p, 'Тренировка должна быть набором полей: title, blocks');
      const id = str(w.id) ?? undefined;
      if (id) {
        if (!/^[A-Za-z0-9-]+$/.test(id)) fail([...p, 'id'], `id только из латиницы, цифр и дефиса: ${id}`);
        else if (ids.has(id)) fail([...p, 'id'], `id повторяется: ${id}`, 'У каждой тренировки в тексте свой id.');
        ids.set(id, wi);
      }
      const title = str(w.title);
      if (!title) fail(p, 'У тренировки нет title');
      let date: string | undefined;
      if (w.date !== undefined) {
        const d = str(w.date);
        if (!d || !isDate(d)) fail([...p, 'date'], `Неверная дата: ${String(w.date)}`, 'Пишите так: 2026-11-03.');
        else date = d;
      }
      if (!Array.isArray(w.blocks) || w.blocks.length === 0) {
        fail([...p, 'blocks'], 'У тренировки нет blocks', 'Добавьте хотя бы один блок.');
        return;
      }
      const blocks: PreviewBlock[] = [];
      const raws: RawBlock[] = [];
      w.blocks.forEach((b: Json, bi: number) => {
        const bp: Path = [...p, 'blocks', bi];
        if (!isObj(b)) return fail(bp, 'Блок должен быть набором полей: type, exercises');
        const type = str(b.type);
        if (!type || !(BLOCK_TYPES as readonly string[]).includes(type)) {
          return fail([...bp, 'type'], `Неизвестный type: ${type ?? 'не указан'}`, 'Допустимо: sets, circuit, superset, warmup, cooldown, timed.');
        }
        if (type === 'timed') {
          if (!Array.isArray(b.exercises) || b.exercises.length === 0) return fail([...bp, 'exercises'], 'В блоке нет exercises', 'Добавьте хотя бы одно упражнение.');
          const own = readTimed(b.exercises, [...bp, 'exercises'], wi, 'блока');
          const text = str(b.text) ?? undefined;
          blocks.push({ kind: 'exercises', heading: `По таймеру · ${formatDuration({ min: own.totalSec, max: own.totalSec })}`, ...(text ? { text } : {}), items: own.items });
          raws.push({ type, ...(text ? { text } : {}), exercises: own.exercises });
          return;
        }
        if (type === 'warmup' || type === 'cooldown') {
          const head = type === 'warmup' ? 'Разминка' : 'Заминка';
          const routineId = str(b.routine);
          if (routineId) {
            const routine = routineList.get(routineId);
            if (!routine) return fail([...bp, 'routine'], `Неизвестный набор: ${routineId}`, 'Опишите его в routines.');
            if (b.exercises !== undefined) warn([...bp, 'exercises'], 'exercises рядом с routine не нужны', 'Берётся набор.');
            if (b.time !== undefined) warn([...bp, 'time'], 'time рядом с routine не нужен', 'Время берётся из упражнений набора.');
            for (const e of routine.exercises) used.get(norm(e.name))?.workouts.add(wi);
            const text = str(b.text) ?? undefined;
            blocks.push({ kind: type, heading: `${head} · ${formatDuration({ min: routine.totalSec, max: routine.totalSec })}`, ...(text ? { text } : {}), items: routine.items });
            raws.push({ type, ...(text ? { text } : {}), exercises: routine.exercises });
            return;
          }
          if (b.exercises !== undefined) {
            if (!Array.isArray(b.exercises) || b.exercises.length === 0) return fail([...bp, 'exercises'], 'В блоке нет exercises', 'Добавьте хотя бы одно упражнение или уберите поле.');
            if (b.time !== undefined) warn([...bp, 'time'], 'time рядом с exercises не нужен', 'Время берётся из упражнений.');
            const own = readTimed(b.exercises, [...bp, 'exercises'], wi, 'блока');
            const text = str(b.text) ?? undefined;
            blocks.push({ kind: type, heading: `${head} · ${formatDuration({ min: own.totalSec, max: own.totalSec })}`, ...(text ? { text } : {}), items: own.items });
            raws.push({ type, ...(text ? { text } : {}), exercises: own.exercises });
            return;
          }
          const t = b.time === undefined ? null : parseDuration(b.time);
          if (b.time !== undefined && !t) fail([...bp, 'time'], `Не понимаю время: ${String(b.time)}`, 'Пишите 5-7m, 45s или 1:30.');
          blocks.push({ kind: type, heading: t ? `${head} · ${formatDuration(t)}` : head, text: str(b.text) ?? undefined, items: [] });
          raws.push({ type, ...(t ? { time: t } : {}), ...(str(b.text) ? { text: str(b.text)! } : {}), exercises: [] });
          return;
        }
        if (!Array.isArray(b.exercises) || b.exercises.length === 0) return fail([...bp, 'exercises'], 'В блоке нет exercises', 'Добавьте хотя бы одно упражнение.');
        const rounds = b.rounds === undefined ? null : Number(b.rounds);
        if (b.rounds !== undefined && (!Number.isInteger(rounds) || rounds! < 1)) fail([...bp, 'rounds'], 'rounds должно быть числом кругов');
        const items: PreviewItem[] = [];
        const exercises: RawExercise[] = [];
        let exerciseRest: number | undefined;
        b.exercises.forEach((e: Json, ei: number) => {
          const ep: Path = [...bp, 'exercises', ei];
          if (!isObj(e)) return fail(ep, 'Упражнение должно быть набором полей: name, reps');
          const name = resolve(e, ep, wi);
          const value = valueText(e, ep, type === 'sets');
          if (name && value) {
            items.push({ name, value: value.text });
            exercises.push({ name, load: value.load });
            exerciseRest ??= restSec(e.rest, [...ep, 'rest']);
          }
        });
        const rest = b.rest === undefined ? exerciseRest : restSec(b.rest, [...bp, 'rest']);
        const raw: RawBlock = { type: type as RawBlock['type'], ...(rounds && rounds > 0 ? { rounds } : {}), ...(rest !== undefined ? { rest } : {}), exercises };
        raws.push(raw);
        for (const name of usesDistance(raw)) warn([...bp], `«${name}» посчитаем по времени`, 'Расстояния в тренировке пока нет: по умолчанию 5 минут, его можно поменять в «Изменить».');
        const heading = type === 'sets' ? 'Подходами' : `${type === 'circuit' ? 'Круг' : 'Суперсет'}${rounds && rounds > 0 ? ` · ${rounds} ${roundsWord(rounds)}` : ''}`;
        blocks.push({ kind: 'exercises', heading, items });
      });
      built.push({ id, title: title ?? '', date, blocks, structure: buildBlocks(raws) });
    });
  }

  // ── Даты: из date и из plan ─────────────────────────────
  const occurrences: Occurrence[] = [];
  built.forEach((b, index) => {
    if (b.date) occurrences.push({ date: b.date, index });
  });

  if (root.plan !== undefined) {
    const pl = root.plan;
    if (!isObj(pl)) fail(['plan'], 'plan должен быть набором полей: weeks, schedule');
    else {
      const weeks = Number(pl.weeks);
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) fail(['plan', 'weeks'], 'plan.weeks — число недель от 1 до 52');
      const start = pl.start === undefined ? null : str(pl.start);
      if (pl.start !== undefined && (!start || !isDate(start))) fail(['plan', 'start'], `Неверная дата start: ${String(pl.start)}`, 'Пишите так: 2026-11-02.');
      const schedule = Array.isArray(pl.schedule) ? pl.schedule : [pl.schedule];
      if (pl.schedule === undefined) fail(['plan'], 'В plan нет schedule', 'День недели → id тренировки, например mon: legs-a.');
      else if (Number.isInteger(weeks) && weeks >= 1 && weeks <= 52) {
        // Повтор считается от понедельника недели start; по умолчанию — ближайший понедельник
        const first = weekStart(start ?? nextMonday(ctx.today));
        schedule.forEach((s, si) => {
          if (!isObj(s)) return fail(['plan', 'schedule', si], 'schedule — это день недели и id тренировки: mon: legs-a');
          for (const [day, ref] of Object.entries(s)) {
            const d = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
            if (d < 0) return fail(['plan', 'schedule', si, day], `Неизвестный день недели: ${day}`, 'Допустимо: mon, tue, wed, thu, fri, sat, sun.');
            const target = ids.get(String(ref));
            if (target === undefined) return fail(['plan', 'schedule', si, day], `В schedule неизвестная тренировка: ${String(ref)}`, 'В плане можно ссылаться только на id из workouts.');
            for (let w = 0; w < weeks; w++) {
              if (Array.isArray(pl.schedule) ? w % schedule.length === si : true) {
                const date = addDays(first, w * 7 + d);
                if (!start || date >= start) occurrences.push({ date, index: target });
              }
            }
          }
        });
      }
    }
  }

  if (errors.length) return { ok: false, errors: sortIssues(errors) };

  // ── Тренировки без даты: только шаблоны ─────────────────
  const dated = new Set(occurrences.map((o) => o.index));
  built.forEach((b, i) => {
    if (!dated.has(i)) warn(['workouts', i], `«${b.title}» без даты`, 'Она сохранится шаблоном — поставить в план можно вручную.');
  });
  const seenDates = new Map<string, number>();
  for (const o of occurrences) {
    if (seenDates.has(o.date) && seenDates.get(o.date) !== o.index) {
      warn(['workouts', o.index], `На ${dayLabel(o.date)} две тренировки из файла`, `В календарь попадёт «${built[o.index]!.title}».`);
    }
    seenDates.set(o.date, o.index);
  }

  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.index - b.index));
  const unique = [...new Map(occurrences.map((o) => [o.date, o])).values()];

  // ── Недели для проверки и источник для шага «План» ──────
  const firstMonday = unique.length ? weekStart(unique[0]!.date) : weekStart(ctx.today);
  const byWeek = new Map<number, Occurrence[]>();
  const planWorkouts: PlanWorkout[] = [];
  for (const o of unique) {
    const week = Math.round((parseIso(o.date).getTime() - parseIso(firstMonday).getTime()) / (7 * 86_400_000));
    const weekday = (parseIso(o.date).getDay() + 6) % 7;
    byWeek.set(week, [...(byWeek.get(week) ?? []), o]);
    planWorkouts.push({ week, weekday, title: built[o.index]!.title, ref: o.index });
  }

  const weeks: PreviewWeek[] = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, list]) => {
      const monday = addDays(firstMonday, week * 7);
      const sunday = addDays(monday, 6);
      const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7);
      return {
        range: sameMonth ? `${parseIso(monday).getDate()} – ${dayLabel(sunday)}` : `${dayLabel(monday)} – ${dayLabel(sunday)}`,
        sessions: list.map((o): PreviewSession => {
          const b = built[o.index]!;
          return {
            id: `${week}-${o.index}-${o.date}`,
            date: `${WEEKDAY_SHORT[(parseIso(o.date).getDay() + 6) % 7]}, ${dayLabel(o.date)}`,
            title: b.title,
            blocks: b.blocks,
            past: o.date < ctx.today,
          };
        }),
      };
    });

  // Набор, который никто не подключил, упражнений не создаёт
  const usedList = [...used.values()].map((u) => ({ ...u, usedIn: [...u.workouts].filter((n) => n !== IN_ROUTINE).length })).filter((u) => u.usedIn > 0);
  const newExercises: NewExercise[] = usedList.map((u, i) => ({
    key: `e${i}`,
    name: u.name,
    usedIn: u.usedIn,
    hasVideo: u.hasVideo,
    muscles: u.muscles,
    similar: u.similar,
    candidates: u.candidates,
    slug: u.slug,
    aliases: u.aliases,
    measure: u.measure,
    video: u.video,
    notes: u.notes,
  }));

  const weekdays = [...new Set(planWorkouts.map((w) => w.weekday))].sort().map((d) => WEEKDAY_SHORT[d]!);
  const preview: PreviewData = {
    lines: text.replace(/\n+$/, '').split('\n').length,
    days: weekdays.join(' · '),
    period: unique.length ? `${dayLabel(unique[0]!.date)} — ${dayLabel(unique[unique.length - 1]!.date)}` : '',
    found: foundLib.size,
    newExercises,
    weeks,
    weeksNote: 'Изменения — относительно того же дня прошлой недели.',
    warnings: warnings.map((w) => (w.line ? `Строка ${w.line}: ${w.message}` : w.message)),
  };
  return {
    ok: true,
    preview,
    plan: { firstMonday, today: ctx.today, workouts: planWorkouts, mine: ctx.mine },
    workouts: built.map((b) => ({ slug: b.id, title: b.title, blocks: b.blocks, structure: b.structure })),
    warnings: sortIssues(warnings),
  };
}

/** Как считать упражнение, которое описали только названием: по тому, чем его нагрузили */
function inferMeasure(ex: Obj): Measure {
  if (ex.time !== undefined) return 'time';
  if (ex.distance !== undefined) return 'distance';
  if (ex.weight !== undefined || (typeof ex.do === 'string' && ex.do.includes('@'))) return 'weight';
  return 'reps';
}

const sortIssues = (list: ParseIssue[]): ParseIssue[] => [...list].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

const roundsWord = (n: number) => plural(n, ['раунд', 'раунда', 'раундов']);

/** Ближайший понедельник не раньше сегодняшнего дня */
function nextMonday(today: string): string {
  const dow = (parseIso(today).getDay() + 6) % 7;
  return dow === 0 ? today : addDays(today, 7 - dow);
}
