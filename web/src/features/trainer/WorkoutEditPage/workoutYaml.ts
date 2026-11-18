import { parse, stringify } from 'yaml';
import { exercisesOf } from '../../../../../shared/blocks';
import type { Block, Exercise, LibraryEntry, Range, RoutineSlugs, SetsExercise } from '../../../../../shared/types';
import { parseImport, type ParseIssue } from '../../import/parse';
import type { LibraryExercise } from '../../exercises/types';
import { roundsOf } from './draft';

/** YAML-вид тренировки для редактора: тот же формат, что у импорта, плюс два поля блока — title и video_rounds. Чистые функции. */

export type RoutineLinks = RoutineSlugs;
/** Набор из библиотеки: по нему проверяются ссылки routine */
export type KnownRoutine = { id: string; kind: 'warmup' | 'cooldown'; title: string };

export type YamlResult = { ok: true; title: string; blocks: Block[]; links: RoutineLinks; notes?: string } | { ok: false; issues: ParseIssue[] };

const rangeText = (r: Range, unit = ''): string | number => (r.min === r.max ? r.min : `${r.min}-${r.max}${unit}`);
const isOpen = (r: Range) => r.min === 0 && r.max === 0;

/** Блок по таймеру без kind из старых данных: разминка или заминка, если у упражнений есть поза (её ставил импорт) или так назван блок */
const isLegacyRoutine = (b: Block): boolean => exercisesOf(b).some((e) => e.pose !== undefined) || /разминк|заминк/i.test(b.title);

const isCooldown = (b: Block): boolean => b.mode === 'timed' && (b.kind ? b.kind === 'cooldown' : exercisesOf(b).some((e) => e.pose === 'stretch') || /заминк/i.test(b.title));

/** Встроенная (не по ссылке) разминка или заминка: в v2 их нет, поэтому в тексте их нет, а форма правит их сама */
export const isEmbeddedRoutine = (b: Block): boolean => b.mode === 'timed' && (!!b.kind || isLegacyRoutine(b));

/** Как разбор ищет упражнение по названию и алиасам; от него зависит, какой id писать в exercise_id */
const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

function libraryIds(library: LibraryExercise[]): (name: string) => string {
  const byName = new Map<string, string>();
  for (const l of library) for (const n of [l.name, ...(l.aliases ?? [])]) byName.set(norm(n), l.id);
  // Не нашли: пишем название, разбор ответит «Неизвестный exercise_id»
  return (name) => byName.get(norm(name)) ?? name;
}

type IdOf = (name: string) => string;

function exerciseYaml(e: Exercise, inSets: boolean, b: Block, idOf: IdOf): Record<string, unknown> {
  const sets = inSets ? (e as SetsExercise) : undefined;
  return {
    exercise_id: idOf(e.name),
    ...(sets ? { sets: sets.sets } : {}),
    ...(e.kind === 'time' ? { time_sec: isOpen(e.target) ? 'max' : e.target.max } : { reps: isOpen(e.target) ? 'max' : rangeText(e.target) }),
    ...(e.kind === 'weight' ? { weight_kg: e.weight ?? 0 } : {}),
    ...(sets ? { rest_sec: sets.restSec ?? (b.mode === 'sets' ? b.restSec : 0) } : {}),
    ...(e.sides ? { sides: e.sides } : {}),
    ...(e.note ? { notes: e.note } : {}),
  };
}

/** Старые круги (отдых после каждого упражнения): в v2 такого нет, после сохранения отдых будет после круга */
export function legacyCircuitWarnings(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.mode === 'circuit' && b.restAfter !== 'round' ? [`Отдых в круге «${b.title}» после сохранения будет после круга, а не после каждого упражнения`] : []));
}

/** Состав тренировки как YAML (version: 2) для редактирования; подключённые наборы пишутся блоками routine: разминка первой, заминка последней */
export function workoutToYaml(title: string, blocks: Block[], links: RoutineLinks = {}, library: LibraryExercise[] = [], notes?: string): string {
  const idOf = libraryIds(library);
  const embedded = blocks.filter(isEmbeddedRoutine);
  const out = blocks.filter((b) => !isEmbeddedRoutine(b)).map((b) => {
    if (b.mode === 'note') return { type: 'note', title: b.title, text: b.text };
    const head = { title: b.title, ...(b.mode !== 'timed' && b.videoRounds.length ? { video_rounds: b.videoRounds } : {}) };
    if (b.mode === 'timed') {
      return { type: 'timed', ...head, ...(b.note ? { text: b.note } : {}), exercises: b.exercises.map((e) => ({ exercise_id: idOf(e.name), time_sec: e.target.max, ...(e.sides ? { sides: e.sides } : {}) })) };
    }
    if (b.mode === 'sets') return { type: 'sets', ...head, exercises: b.exercises.map((e) => exerciseYaml(e, true, b, idOf)) };
    return { type: 'circuit', ...head, rounds: b.rounds, rest_sec: b.restSec, exercises: b.exercises.map((e) => exerciseYaml(e, false, b, idOf)) };
  });
  const all = [...(links.warmup ? [{ type: 'warmup', routine: links.warmup }] : []), ...out, ...(links.cooldown ? [{ type: 'cooldown', routine: links.cooldown }] : [])];
  const doc = { version: 2, workouts: [{ title, ...(notes ? { notes } : {}), blocks: all }] };
  const text = stringify(doc, { lineWidth: 0, flowCollectionPadding: false });
  if (embedded.length === 0) return text;
  // Встроенные разминка и заминка остаются за текстом: комментарий на их месте, разминки первыми, заминки последними
  const note = (b: Block) => `      # ${isCooldown(b) ? 'Заминка' : 'Разминка'} «${b.title.replace(/[\r\n]+/g, ' ')}» — правится в форме\n`;
  const head = embedded.filter((b) => !isCooldown(b)).map(note).join('');
  const tail = embedded.filter(isCooldown).map(note).join('');
  const list = text.replace('    blocks: []\n', '    blocks:\n');
  const at = list.indexOf('    blocks:\n') + '    blocks:\n'.length;
  return list.slice(0, at) + head + list.slice(at) + tail;
}

const toEntry = (l: LibraryExercise): LibraryEntry => ({ id: l.id, name: l.name, aliases: l.aliases ?? [], kind: l.kind, group: l.group, muscles: l.muscles, equipment: l.equipment });

/** Делает id уникальными: при совпадении дописывает номер */
function unique(id: string, taken: Set<string>): string {
  let out = id;
  for (let n = 2; taken.has(out); n++) out = `${id}-${n}`;
  taken.add(out);
  return out;
}

/** Блоки и упражнения на тех же местах оставляют прежние id: на них держатся подсказки и видео; reserved — id, которые заняты за текстом */
function keepIds(blocks: Block[], previous: Block[], reserved: Set<string>): Block[] {
  const taken = new Set(reserved);
  return blocks.map((b, i) => {
    const before = previous[i];
    const id = unique(before?.id ?? b.id, taken);
    if (b.mode === 'note') return { ...b, id };
    const exercises = b.exercises.map((e, j) => {
      const old = before ? exercisesOf(before)[j] : undefined;
      const same = old?.name === e.name;
      // В v2 время — одно число (берётся большее); диапазон из прежней тренировки возвращаем, пока это число не тронули
      const keepRange = same && e.kind === 'time' && old.kind === 'time' && e.target.min === e.target.max && e.target.max === old.target.max;
      return { ...e, ...(keepRange ? { target: old.target } : {}), id: unique(same ? old.id : e.id.replace(b.id, id), taken) };
    });
    // Отдых блока подходов в v2 не пишется (только у упражнений): остаётся прежним
    if (b.mode === 'sets' && before?.mode === 'sets') return { ...b, id, exercises, restSec: before.restSec } as Block;
    return { ...b, id, exercises } as Block;
  });
}

/** Разбирает YAML редактора. library нужна, чтобы найти упражнения; routines — наборы для routine:; previous — чтобы сохранить id. */
export function workoutFromYaml(text: string, library: LibraryExercise[], previous: Block[], today: string, routines: KnownRoutine[] = []): YamlResult {
  const parsed = parseImport(text, { library: library.map(toEntry), routines, today, mine: {} });
  if (!parsed.ok) return { ok: false, issues: parsed.errors };
  if (parsed.workouts.length !== 1) {
    return { ok: false, issues: [{ message: 'В workouts должна быть одна тренировка', hint: 'Здесь правится только та, что открыта.' }] };
  }
  const missing = parsed.preview.newExercises;
  if (missing.length > 0) {
    return {
      ok: false,
      issues: missing.map((m) => ({ message: `Упражнения «${m.name}» нет в библиотеке`, hint: 'Поправьте название или добавьте упражнение в разделе «Упражнения».' })),
    };
  }
  const only = parsed.workouts[0]!;
  // Набор, описанный в самом файле (routines:), в библиотеку отсюда не попадёт: ссылаться можно только на готовые
  const links: RoutineLinks = {};
  for (const [kind, id] of [['warmup', only.warmupRoutine], ['cooldown', only.cooldownRoutine]] as const) {
    if (!id) continue;
    if (!routines.some((r) => r.id === id)) {
      return { ok: false, issues: [{ message: `Набор «${id}» не найден в библиотеке`, hint: 'Здесь подключаются готовые разминки и заминки; создайте набор на странице разминок.' }] };
    }
    links[kind] = id;
  }
  const { title, structure } = only;
  // Блоки со ссылкой routine в структуру не входят, поэтому и здесь пропускаем их, чтобы номера совпали
  const raw = ((parse(text) as { workouts?: Array<{ blocks?: Array<{ title?: unknown; video_rounds?: unknown; routine?: unknown }> }> }).workouts?.[0]?.blocks ?? []).filter((b) => !b?.routine);
  const issues: ParseIssue[] = [];
  const blocks = structure.map((b, i): Block => {
    const extra = raw[i];
    const own = typeof extra?.title === 'string' && extra.title.trim() ? extra.title.trim() : b.title;
    if (b.mode === 'timed' || b.mode === 'note' || extra?.video_rounds === undefined) return { ...b, title: own };
    const rounds = extra.video_rounds;
    const limit = roundsOf(b);
    if (!Array.isArray(rounds) || !rounds.every((n) => Number.isInteger(n) && n >= 1 && n <= limit)) {
      issues.push({ message: `video_rounds в блоке ${i + 1}: номера от 1 до ${limit}`, hint: 'Пишите списком: video_rounds: [2, 3].' });
      return { ...b, title: own };
    }
    return { ...b, title: own, videoRounds: [...new Set(rounds as number[])].sort((x, y) => x - y) };
  });
  if (issues.length > 0) return { ok: false, issues };
  // Встроенные разминка и заминка в тексте не бывают: возвращаем их как были, разминки первыми, заминки последними.
  // Если автор сам написал такой блок (v1), его блок главнее прежнего.
  const kept = previous.filter(isEmbeddedRoutine);
  const wrote = (cool: boolean) => blocks.some((b) => b.mode === 'timed' && b.kind === (cool ? 'cooldown' : 'warmup'));
  const front = wrote(false) ? [] : kept.filter((b) => !isCooldown(b));
  const back = wrote(true) ? [] : kept.filter(isCooldown);
  const reserved = new Set(kept.flatMap((b) => [b.id, ...exercisesOf(b).map((e) => e.id)]));
  const main = keepIds(blocks, previous.filter((b) => !isEmbeddedRoutine(b)), reserved);
  return { ok: true, title, blocks: [...front, ...main, ...back], links, ...(only.notes ? { notes: only.notes } : {}) };
}

/** Текущее состояние редактора: то, что показано в форме */
export type EditorState = { title: string; blocks: Block[]; links: RoutineLinks; notes: string };

/** Читает текст YAML; если его не трогали после создания, разбор не нужен: возвращается состояние как есть (иначе встроенную разминку не сохранить) */
export function readEditorYaml(text: string, generated: string, current: EditorState, library: LibraryExercise[], today: string, routines: KnownRoutine[] = []): YamlResult {
  if (text === generated) return { ok: true, title: current.title, blocks: current.blocks, links: current.links, ...(current.notes ? { notes: current.notes } : {}) };
  return workoutFromYaml(text, library, current.blocks, today, routines);
}
