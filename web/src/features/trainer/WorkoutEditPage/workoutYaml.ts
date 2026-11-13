import { parse, stringify } from 'yaml';
import type { Block, Exercise, LibraryEntry, Range, RoutineSlugs, SetsExercise } from '../../../../../shared/types';
import { parseImport, type ParseIssue } from '../../import/parse';
import type { LibraryExercise } from '../../exercises/types';
import { roundsOf } from './draft';

/** YAML-вид тренировки для редактора: тот же формат, что у импорта, плюс два поля блока — title и video_rounds. Чистые функции. */

export type RoutineLinks = RoutineSlugs;
/** Набор из библиотеки: по нему проверяются ссылки routine */
export type KnownRoutine = { id: string; kind: 'warmup' | 'cooldown'; title: string };

export type YamlResult = { ok: true; title: string; blocks: Block[]; links: RoutineLinks } | { ok: false; issues: ParseIssue[] };

const rangeText = (r: Range, unit = ''): string | number => (r.min === r.max ? r.min : `${r.min}-${r.max}${unit}`);
const isOpen = (r: Range) => r.min === 0 && r.max === 0;

/** Таймерный блок из одного шага с названием блока — то, что импорт делает из `time: 5m` без набора */
const isPlainTimed = (b: Block): boolean => b.mode === 'timed' && b.exercises.length === 1 && /^(разминка|заминка)$/i.test(b.exercises[0]!.name);

/** Блок по таймеру без kind из старых данных: разминка или заминка, если у упражнений есть поза (её ставил импорт) или так назван блок */
const isLegacyRoutine = (b: Block): boolean => b.exercises.some((e) => e.pose !== undefined) || /разминк|заминк/i.test(b.title);

const isCooldown = (b: Block): boolean => b.exercises.some((e) => e.pose === 'stretch') || /заминк/i.test(b.title);

function exerciseYaml(e: Exercise, withSets: boolean): Record<string, unknown> {
  return {
    name: e.name,
    ...(withSets ? { sets: (e as SetsExercise).sets } : {}),
    ...(e.kind === 'time' ? { time: rangeText(e.target, 's') } : { reps: isOpen(e.target) ? 'max' : rangeText(e.target) }),
    ...(e.kind === 'weight' ? { weight: e.weight ?? 0 } : {}),
  };
}

/** Состав тренировки как YAML для редактирования; подключённые наборы пишутся блоками routine: разминка первой, заминка последней */
export function workoutToYaml(title: string, blocks: Block[], links: RoutineLinks = {}): string {
  const out = blocks.map((b) => {
    const head = { title: b.title, ...(b.mode !== 'timed' && b.videoRounds.length ? { video_rounds: b.videoRounds } : {}) };
    if (b.mode === 'timed' && !b.kind && !isLegacyRoutine(b)) {
      return { type: 'timed', ...head, ...(b.note ? { text: b.note } : {}), exercises: b.exercises.map((e) => ({ name: e.name, time: rangeText(e.target, 's'), ...(e.sides ? { sides: e.sides } : {}) })) };
    }
    if (b.mode === 'timed') {
      // В формате импорта у блока по таймеру два типа; без kind (старые данные) берём по позе и названию
      const type = b.kind ?? (isCooldown(b) ? 'cooldown' : 'warmup');
      const note = b.note ? { text: b.note } : {};
      if (isPlainTimed(b)) return { type, ...head, time: rangeText(b.exercises[0]!.target, 's'), ...note };
      if (b.exercises.length === 0) return { type, ...head, ...note };
      return { type, ...head, ...note, exercises: b.exercises.map((e) => ({ name: e.name, time: rangeText(e.target, 's'), ...(e.sides ? { sides: e.sides } : {}) })) };
    }
    if (b.mode === 'sets') return { type: 'sets', ...head, rest: b.restSec, exercises: b.exercises.map((e) => exerciseYaml(e, true)) };
    return { type: 'circuit', ...head, rounds: b.rounds, rest: b.restSec, exercises: b.exercises.map((e) => exerciseYaml(e, false)) };
  });
  const all = [...(links.warmup ? [{ type: 'warmup', routine: links.warmup }] : []), ...out, ...(links.cooldown ? [{ type: 'cooldown', routine: links.cooldown }] : [])];
  const doc = { version: 1, workouts: [{ title, blocks: all }] };
  return stringify(doc, { lineWidth: 0, flowCollectionPadding: false });
}

const toEntry = (l: LibraryExercise): LibraryEntry => ({ id: l.id, name: l.name, aliases: l.aliases ?? [], kind: l.kind, group: l.group, muscles: l.muscles, equipment: l.equipment });

/** Делает id уникальными: при совпадении дописывает номер */
function unique(id: string, taken: Set<string>): string {
  let out = id;
  for (let n = 2; taken.has(out); n++) out = `${id}-${n}`;
  taken.add(out);
  return out;
}

/** Блоки и упражнения на тех же местах оставляют прежние id: на них держатся подсказки и видео */
function keepIds(blocks: Block[], previous: Block[]): Block[] {
  const taken = new Set<string>();
  return blocks.map((b, i) => {
    const before = previous[i];
    const id = unique(before?.id ?? b.id, taken);
    const exercises = b.exercises.map((e, j) => {
      const old = before?.exercises[j];
      return { ...e, id: unique(old && old.name === e.name ? old.id : e.id.replace(b.id, id), taken) };
    });
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
    if (b.mode === 'timed' || extra?.video_rounds === undefined) return { ...b, title: own };
    const rounds = extra.video_rounds;
    const limit = roundsOf(b);
    if (!Array.isArray(rounds) || !rounds.every((n) => Number.isInteger(n) && n >= 1 && n <= limit)) {
      issues.push({ message: `video_rounds в блоке ${i + 1}: номера от 1 до ${limit}`, hint: 'Пишите списком: video_rounds: [2, 3].' });
      return { ...b, title: own };
    }
    return { ...b, title: own, videoRounds: [...new Set(rounds as number[])].sort((x, y) => x - y) };
  });
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, title, blocks: keepIds(blocks, previous), links };
}
