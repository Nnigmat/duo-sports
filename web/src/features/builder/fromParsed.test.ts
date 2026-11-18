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

  it('draft carries workout and exercise notes', () => {
    const d = draftOf(agent({ notes: 'Замер в конце', blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', sets: 4, reps: '8', notes: 'Лопатки сведены' }] }] }));
    expect(d.notes).toBe('Замер в конце');
    expect(d.blocks[0]!.mode === 'sets' && d.blocks[0]!.exercises[0]!.note).toBe('Лопатки сведены');
  });

  it('draft without repair has no marks and nothing unparsed', () => {
    expect(draftOf(agent())).toMatchObject({ marks: {}, unparsed: [] });
  });

  it('new exercise takes agent fields', () => {
    const d = draftOf(agent({ new_exercises: [clap], blocks: [{ type: 'circuit', rounds: 3, exercises: [{ exercise_id: 'clap-pushup', time_sec: 30 }] }] }));
    expect(d.newExercises).toEqual([
      { name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['трицепс'], kind: 'time', equipment: ['Коврик'], notes: 'Корпус прямой', aliases: ['хлопки'] },
    ]);
  });

  it('new exercise keeps similar from parse', () => {
    const d = draftOf(agent({ new_exercises: [{ id: 'weighted-dips', name: 'Отжимания на брусьях с весом', muscles: [], measure: 'reps', equipment: [], aliases: [] }], blocks: [{ type: 'sets', exercises: [{ exercise_id: 'weighted-dips', sets: 3, reps: '8' }] }] }));
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
      cooldown: { new_routine: { id: 'my-cool', title: 'Растяжка шеи', exercises: [{ exercise_id: 'arm-circles', time_sec: 30, sides: ['вправо', 'влево'] }, { exercise_id: 'neck-roll', time_sec: 45, sides: ['вперёд', 'назад'] }, { exercise_id: 'arm-circles', time_sec: 60 }] } },
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
    const d = draftOf(agent({ new_exercises: [clap], blocks: [{ type: 'sets', exercises: [{ exercise_id: 'clap-pushup', sets: 3, reps: '10' }] }], advice: [{ text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'dips' }, { text: 'Неизвестное', suggest: 'nope' }] }));
    expect(d.advice).toHaveLength(2);
    expect(d.advice[0]).toMatchObject({ text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'Отжимания на брусьях' });
    expect(d.advice[1]).not.toHaveProperty('suggest');
    expect(new Set(d.advice.map((a) => a.id)).size).toBe(2);
  });

  it('missing picked exercise adds advice', () => {
    const d = draftOf(agent({ blocks: [{ type: 'sets', exercises: [{ exercise_id: 'dips', sets: 3, reps: '10' }] }] }), ['bench-press', 'dips']);
    expect(d.advice.map((a) => a.text)).toEqual(['Нет выбранного упражнения: Жим лёжа']);
  });
});
