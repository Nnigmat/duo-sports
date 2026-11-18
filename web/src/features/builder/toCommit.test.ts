import { describe, expect, it } from 'vitest';
import type { ImportCommit } from '../../../../shared/types';
import { ctx } from './testkit';
import { draftToCommit } from './toCommit';
import type { BuilderDraft, NewExerciseDraft } from './types';
import { exercisesOf } from '../../../../shared/blocks';

const clap: NewExerciseDraft = { name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['грудь'], kind: 'reps', equipment: ['Коврик'], notes: 'Корпус прямой', aliases: ['хлопки'] };
const bend: NewExerciseDraft = { name: 'Наклон к ногам', slug: 'bend', muscles: ['спина'], kind: 'time', equipment: [], notes: '', aliases: [] };

const base = (over: Partial<BuilderDraft> = {}): BuilderDraft => ({
  date: '2026-11-18',
  title: 'Верх',
  blocks: [
    { id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'x1', name: 'Отжимания с хлопком', kind: 'reps', target: { min: 10, max: 10 }, sets: 3 }, { id: 'x2', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 4 }] },
  ],
  newExercises: [clap],
  warmup: { kind: 'library', slug: 'neck-shoulders' },
  cooldown: { kind: 'none' },
  advice: [],
  ...over,
});

const commitOf = (d: BuilderDraft): ImportCommit => {
  const r = draftToCommit(d, ctx);
  if (!r.ok) throw new Error(r.problems.join('; '));
  return r.commit;
};
const problemsOf = (d: BuilderDraft): string[] => {
  const r = draftToCommit(d, ctx);
  return r.ok ? [] : r.problems;
};

describe('draftToCommit', () => {
  it('builds one workout on the date', () => {
    const c = commitOf(base());
    expect(c.workouts).toHaveLength(1);
    expect(c.workouts[0]).toMatchObject({ title: 'Верх', structure: base().blocks, warmupRoutine: 'neck-shoulders' });
    expect(c.workouts[0]).not.toHaveProperty('cooldownRoutine');
    expect(c.workouts[0]!.blocks[0]).toMatchObject({ kind: 'exercises', heading: 'Подходами' });
    expect(c.entries).toEqual([{ date: '2026-11-18', workout: 0 }]);
    expect(c.replaceDates).toEqual([]);
    expect(c.exercises).toEqual([{ id: 'clap-pushup', name: 'Отжимания с хлопком', aliases: ['хлопки'], muscles: ['грудь'], kind: 'reps', group: 'chest', equipment: ['Коврик'], notes: 'Корпус прямой' }]);
  });

  it('links library routine and creates new one with exercise slugs', () => {
    const c = commitOf(base({ newExercises: [clap, bend], cooldown: { kind: 'new', title: 'Растяжка вечер', items: [{ name: 'Наклон к ногам', sec: 45 }, { name: 'Вращение руками', sec: 30, sides: ['вправо', 'влево'] }] } }));
    expect(c.routines).toHaveLength(1);
    const r = c.routines[0]!;
    expect(r).toMatchObject({ kind: 'cooldown', title: 'Растяжка вечер', items: [{ exercise: 'bend', sec: { min: 45, max: 45 } }, { exercise: 'arm-circles', sec: { min: 30, max: 30 }, sides: ['вправо', 'влево'] }] });
    expect(r.id).toMatch(/^my-/);
    expect(c.workouts[0]!.cooldownRoutine).toBe(r.id);
    expect(c.exercises.map((e) => e.id)).toEqual(['clap-pushup', 'bend']);
  });

  it('new exercise renamed to library name is not created', () => {
    const renamed = { ...clap, name: 'брусья' };
    const blocks = base().blocks.map((b) => ({ ...b, exercises: exercisesOf(b).map((e) => (e.name === clap.name ? { ...e, name: 'брусья' } : e)) })) as BuilderDraft['blocks'];
    const c = commitOf(base({ newExercises: [renamed], blocks }));
    expect(c.exercises).toEqual([]);
    expect(exercisesOf(c.workouts[0]!.structure![0]!).map((e) => e.name)).toEqual(['Отжимания на брусьях', 'Жим лёжа']);
    expect(c.workouts[0]!.blocks[0]!.items[0]!.name).toBe('Отжимания на брусьях');
  });

  it('suffixes slug taken in library', () => {
    const c = commitOf(base({ newExercises: [{ ...clap, slug: 'dips' }] }));
    expect(c.exercises[0]!.id).toBe('dips-2');
  });

  it('gives a slug to new exercise without one', () => {
    const c = commitOf(base({ newExercises: [{ ...clap, slug: '' }] }));
    expect(c.exercises[0]!.id).toMatch(/^my-/);
  });

  it('suffixes new routine slug taken in library', () => {
    // importSlug от названия совпасть с библиотечным не может, но slug библиотеки тоже начинается с my- у импортированных
    const taken = { ...ctx, routines: [...ctx.routines] };
    const r = draftToCommit(base({ newExercises: [clap, bend], cooldown: { kind: 'new', title: 'Растяжка вечер', items: [{ name: 'Наклон к ногам', sec: 45 }] } }), taken);
    if (!r.ok) throw new Error('ожидали коммит');
    const slug = r.commit.routines[0]!.id;
    const again = draftToCommit(base({ newExercises: [clap, bend], cooldown: { kind: 'new', title: 'Растяжка вечер', items: [{ name: 'Наклон к ногам', sec: 45 }] } }), { ...ctx, routines: [...ctx.routines, { id: slug, kind: 'warmup', title: 'Другая' }] });
    if (!again.ok) throw new Error('ожидали коммит');
    expect(again.commit.routines[0]!.id).toBe(`${slug}-2`);
  });

  it('reports duplicate routine title', () => {
    expect(problemsOf(base({ newExercises: [clap, bend], cooldown: { kind: 'new', title: 'растяжка СПИНЫ', items: [{ name: 'Наклон к ногам', sec: 45 }] } }))).toContain('Заминка «растяжка СПИНЫ» уже есть — дайте другое название');
    // Совпадение с разминкой другого вида — не дубль
    expect(problemsOf(base({ newExercises: [clap, bend], cooldown: { kind: 'new', title: 'Шея и плечи', items: [{ name: 'Наклон к ногам', sec: 45 }] } }))).toEqual([]);
  });

  it('accepts any exercise in a new routine', () => {
    expect(problemsOf(base({ warmup: { kind: 'new', title: 'Своя', items: [{ name: 'Жим лёжа', sec: 30 }, { name: 'Отжимания с хлопком', sec: 30 }] } }))).toEqual([]);
  });

  it('reports empty new routine', () => {
    expect(problemsOf(base({ warmup: { kind: 'new', title: 'Своя', items: [] } }))).toEqual(['В новой разминке нет упражнений']);
  });

  it('reports new exercise without muscles', () => {
    expect(problemsOf(base({ newExercises: [{ ...clap, muscles: [] }] }))).toEqual(['У нового упражнения «Отжимания с хлопком» не указаны мышцы']);
  });

  it('reports form problems', () => {
    expect(problemsOf(base({ title: ' ' }))).toContain('Введите название тренировки');
  });

  it('drops unused new exercises', () => {
    const c = commitOf(base({ newExercises: [clap, bend] }));
    expect(c.exercises.map((e) => e.id)).toEqual(['clap-pushup']);
  });
});
