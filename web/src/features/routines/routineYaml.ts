import { parse, stringify, YAMLParseError } from 'yaml';
import type { RoutineKind } from '../../../../shared/types';
import { type DraftItem, LIMITS, newKey, type RoutineDraft } from './routines';

/** YAML-вид разминки для формы: kind, title, note, exercises. Slug не пишется: его задаёт сервер по названию. Чистые функции. */

export type YamlIssue = { line?: number; message: string };
export type YamlResult = { ok: true; draft: RoutineDraft } | { ok: false; issues: YamlIssue[] };
export type KnownExercise = { id: string; name: string };

const secText = (it: DraftItem): string | number => (it.min === it.max ? Number(it.max) : `${it.min}-${it.max}`);

export function draftToYaml(d: RoutineDraft): string {
  const doc: Record<string, unknown> = { kind: d.kind, title: d.title };
  if (d.note.trim()) doc.note = d.note.trim();
  doc.exercises = d.items.map((it) => ({
    exercise: it.exercise,
    sec: Number.isFinite(Number(it.min)) && Number.isFinite(Number(it.max)) && it.min && it.max ? secText(it) : it.max,
    ...(it.sides ? { sides: [it.sideA, it.sideB] } : {}),
  }));
  return stringify(doc, { lineWidth: 0, flowCollectionPadding: false });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Читает YAML в черновик; при ошибках возвращает их все сразу и ничего не меняет */
export function draftFromYaml(text: string, library: KnownExercise[], current: Pick<RoutineDraft, 'kind'>): YamlResult {
  let doc: unknown;
  try {
    doc = parse(text);
  } catch (e) {
    if (e instanceof YAMLParseError) return { ok: false, issues: [{ line: e.linePos?.[0].line, message: 'Не разобрать YAML: проверьте отступы и двоеточия' }] };
    return { ok: false, issues: [{ message: 'Не разобрать YAML' }] };
  }
  if (!isObj(doc)) return { ok: false, issues: [{ message: 'Нужен набор полей: kind, title, exercises' }] };

  const issues: YamlIssue[] = [];
  const bad = (message: string) => issues.push({ message });
  for (const k of Object.keys(doc)) if (!['kind', 'title', 'note', 'exercises'].includes(k)) bad(`Неизвестное поле ${k}. Можно kind, title, note, exercises`);

  const kind = doc.kind ?? current.kind;
  if (kind !== 'warmup' && kind !== 'cooldown') bad('kind: warmup или cooldown');
  const title = typeof doc.title === 'string' ? doc.title.trim() : '';
  if (!title) bad('Нет названия (title)');
  else if (title.length > LIMITS.title) bad(`Название не длиннее ${LIMITS.title} знаков`);
  const note = doc.note === undefined || doc.note === null ? '' : String(doc.note).trim();
  if (note.length > LIMITS.note) bad(`Пояснение не длиннее ${LIMITS.note} знаков`);

  const items: DraftItem[] = [];
  const list = doc.exercises;
  if (!Array.isArray(list) || list.length === 0) bad('Нет ни одного упражнения в exercises');
  else if (list.length > LIMITS.items) bad(`Упражнений не больше ${LIMITS.items}`);
  else
    list.forEach((raw, i) => {
      const n = `Упражнение ${i + 1}: `;
      if (!isObj(raw)) return bad(`${n}нужны поля exercise и sec`);
      const slug = typeof raw.exercise === 'string' ? raw.exercise : '';
      const known = library.find((e) => e.id === slug);
      if (!slug) bad(`${n}нет поля exercise`);
      else if (!known) bad(`${n}нет упражнения на время «${slug}»`);
      const sm = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(String(raw.sec ?? '').trim());
      let min = 0;
      let max = 0;
      if (!sm) bad(`${n}sec — число или диапазон, например 30-45`);
      else {
        min = Number(sm[1]);
        max = sm[2] ? Number(sm[2]) : min;
        if (min < 1 || max > LIMITS.sec) bad(`${n}секунды от 1 до ${LIMITS.sec}`);
        else if (min > max) bad(`${n}начало диапазона больше конца`);
      }
      let sides: [string, string] | undefined;
      if (raw.sides !== undefined) {
        if (Array.isArray(raw.sides) && raw.sides.length === 2 && raw.sides.every((s) => typeof s === 'string' && s.trim())) sides = [String(raw.sides[0]).trim(), String(raw.sides[1]).trim()];
        else bad(`${n}sides — две подписи, например [Левая, Правая]`);
      }
      if (known && sm)
        items.push({ key: newKey(), exercise: known.id, name: known.name, min: String(min), max: String(max), sides: !!sides, sideA: sides?.[0] ?? 'Левая', sideB: sides?.[1] ?? 'Правая' });
    });

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, draft: { kind: kind as RoutineKind, title, note, items } };
}
