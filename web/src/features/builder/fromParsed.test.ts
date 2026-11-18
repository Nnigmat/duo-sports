import { describe, expect, it } from 'vitest';
import type { AgentWorkout } from '../../../../shared/aiDraft';
import { parseImport, type ParsedImport } from '../import/parse';
import { draftFromParsed } from './fromParsed';
import { agent, ctx } from './testkit';
import { agentToImportYaml } from './toImportDoc';

const parsed = (w: AgentWorkout): ParsedImport => {
  const r = parseImport(agentToImportYaml(w, '2026-11-18'), ctx);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
};
const draftOf = (w: AgentWorkout, picked: string[] = []) => draftFromParsed(parsed(w), w, ctx, '2026-11-18', picked);

const clap = { id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['трицепс'], measure: 'distance' as const, equipment: ['Коврик'], notes: 'Корпус прямой', aliases: ['хлопки'] };

describe('draftFromParsed', () => {
  it('main blocks come from structure', () => {
    const w = agent();
    const p = parsed(w);
    const d = draftFromParsed(p, w, ctx, '2026-11-18', []);
    expect(d.blocks).toEqual(p.workouts[0]!.structure);
    expect(d).toMatchObject({ date: '2026-11-18', title: 'Верх тела' });
  });

  it('workout notes reach the draft', () => {
    const w = agent();
    const p = parsed(w);
    const withNotes = { ...p, workouts: [{ ...p.workouts[0]!, notes: 'Замер в конце' }] } as ParsedImport;
    expect(draftFromParsed(withNotes, w, ctx, '2026-11-18', []).notes).toBe('Замер в конце');
    expect(draftFromParsed(p, w, ctx, '2026-11-18', [])).not.toHaveProperty('notes');
  });

  it('new exercise takes agent fields', () => {
    const d = draftOf(agent({ new_exercises: [clap], blocks: [{ type: 'circuit', rounds: 3, exercises: [{ exercise_id: 'clap-pushup', time: '30s' }] }] }));
    expect(d.newExercises).toEqual([
      { name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['трицепс'], kind: 'time', equipment: ['Коврик'], notes: 'Корпус прямой', aliases: ['хлопки'] },
    ]);
  });

  it('new exercise keeps similar from parse', () => {
    const d = draftOf(agent({ blocks: [{ type: 'sets', exercises: [{ name: 'Отжимания на брусьях с весом', do: '3x8' }] }] }));
    expect(d.newExercises[0]).toMatchObject({ name: 'Отжимания на брусьях с весом', similar: 'Отжимания на брусьях', kind: 'reps', muscles: [] });
  });

  it('library warmup becomes library pick', () => {
    expect(draftOf(agent()).warmup).toEqual({ kind: 'library', slug: 'neck-shoulders' });
    expect(draftOf(agent()).cooldown).toEqual({ kind: 'none' });
  });

  it('new routine becomes new pick with names and seconds', () => {
    const neck = { ...clap, id: 'neck-roll', name: 'Наклоны головы', measure: 'time' as const, muscles: ['шея'] };
    const w = agent({
      new_exercises: [neck],
      cooldown: { new_routine: { id: 'my-cool', title: 'Растяжка шеи', exercises: [{ exercise_id: 'arm-circles', time: '30s', per_side: true }, { exercise_id: 'neck-roll', time: '45s', sides: ['вперёд', 'назад'] }, { exercise_id: 'arm-circles', time: '1:00' }] } },
    });
    expect(draftOf(w).cooldown).toEqual({
      kind: 'new',
      title: 'Растяжка шеи',
      items: [
        { name: 'Вращение руками', sec: 30, sides: ['вправо', 'влево'] },
        { name: 'Наклоны головы', sec: 45, sides: ['вперёд', 'назад'] },
        { name: 'Вращение руками', sec: 60 },
      ],
    });
  });

  it('advice suggest slug becomes library name', () => {
    const d = draftOf(agent({ new_exercises: [clap], blocks: [{ type: 'sets', exercises: [{ exercise_id: 'clap-pushup', do: '3x10' }] }], advice: [{ text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'dips' }, { text: 'Неизвестное', suggest: 'nope' }] }));
    expect(d.advice).toHaveLength(2);
    expect(d.advice[0]).toMatchObject({ text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'Отжимания на брусьях' });
    expect(d.advice[1]).not.toHaveProperty('suggest');
    expect(new Set(d.advice.map((a) => a.id)).size).toBe(2);
  });

  it('missing picked exercise adds advice', () => {
    const d = draftOf(agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'dips', do: '3x10' }] }] }), ['bench-press', 'dips']);
    expect(d.advice.map((a) => a.text)).toEqual(['Нет выбранного упражнения: Жим лёжа']);
  });
});
