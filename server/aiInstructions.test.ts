import { describe, expect, it } from 'vitest';
import { AGENT_WORKOUT_SCHEMA } from '../shared/aiDraft';
import { AGENT_FORMAT, AGENT_INSTRUCTIONS } from './aiInstructions';

/** Имена всех полей схемы, на любой глубине */
function fieldNames(schema: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(schema)) for (const s of schema) fieldNames(s, out);
  else if (typeof schema === 'object' && schema !== null) {
    const o = schema as Record<string, unknown>;
    if (typeof o.properties === 'object' && o.properties !== null) for (const k of Object.keys(o.properties)) out.add(k);
    for (const v of Object.values(o)) fieldNames(v, out);
  }
  return out;
}
const word = (name: string) => new RegExp(`(^|[^\\w])${name}([^\\w]|$)`);

describe('agent instructions', () => {
  it('mention every schema field', () => {
    const names = [...fieldNames(AGENT_WORKOUT_SCHEMA)];
    expect(names).toContain('time_sec');
    for (const name of names) expect(AGENT_FORMAT, name).toMatch(word(name));
  });

  it('have sides examples', () => {
    for (const text of [AGENT_FORMAT, AGENT_INSTRUCTIONS]) {
      expect(text).toContain('[влево, вправо]');
      expect(text).toContain('[левая нога, правая нога]');
    }
  });

  it('have no v1 fields', () => {
    const all = `${AGENT_INSTRUCTIONS}\n${AGENT_FORMAT}`;
    expect(all).not.toMatch(word('do'));
    expect(all).not.toContain('per_side');
    expect(all).not.toContain('"4x8 @ 60"');
    expect(all).not.toMatch(word('superset'));
  });

  it('state placement and empty-value rules', () => {
    for (const rule of ['только в блоке sets', 'только в circuit', 'только у блоков timed и note', '0 для чисел, "" для строк, [] для списков', 'после круга', '180']) {
      expect(AGENT_INSTRUCTIONS).toContain(rule);
    }
  });

  it('cover routines, sides, max and rest wording', () => {
    for (const text of ['примерно 3 с на повтор', 'В разминке упражнения только на время:', 'Взял за основу', '«Описать свою»', 'ничего не копируй', 'скажи об этом в advice', 'time_sec "max"', 'reps "max"', 'правила админа его не задают']) {
      expect(AGENT_INSTRUCTIONS).toContain(text);
    }
    expect(AGENT_INSTRUCTIONS).toContain('[вперёд, назад]');
  });

  it('forbid max in timed and zero as «без отдыха»', () => {
    const timed = 'в timed time_sec только число; «на максимум» — упражнение в блоке sets';
    expect(AGENT_INSTRUCTIONS).toContain(timed);
    expect(AGENT_FORMAT).toContain('в timed time_sec только число');
    expect(AGENT_FORMAT).toContain('идут сами, например планка 45 с (time_sec 45);');
    expect(AGENT_INSTRUCTIONS).toContain('«Без отдыха» нельзя выразить нулём — 0 значит «по умолчанию»; если тренер явно сказал «без отдыха», напиши это в advice');
  });

  it('cover missing load rules', () => {
    for (const text of ['sets 1', 'reps "10"', 'time_sec 30', 'принятым значением', '"10-12"']) expect(AGENT_INSTRUCTIONS).toContain(text);
  });

  it('allow notes only in sets and circuit', () => {
    expect(AGENT_FORMAT).toContain('только в блоках sets и circuit; в timed ""');
    expect(AGENT_INSTRUCTIONS).toContain('в блоке timed notes у упражнения пусто — такой остаток клади в text блока или в advice');
  });
});
