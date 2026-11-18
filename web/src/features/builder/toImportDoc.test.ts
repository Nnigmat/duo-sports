import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseImport } from '../import/parse';
import { agent, ctx } from './testkit';
import { agentToImportYaml } from './toImportDoc';

const doc = (w = agent()) => parse(agentToImportYaml(w, '2026-11-18'));

const hasNull = (v: unknown): boolean =>
  v === null || (Array.isArray(v) ? v.some(hasNull) : typeof v === 'object' && v !== null ? Object.values(v).some(hasNull) : false);

describe('agentToImportYaml', () => {
  it('builds one workout on the date with version 2', () => {
    const d = doc();
    expect(d.version).toBe(2);
    expect(d.workouts).toHaveLength(1);
    expect(d.workouts[0]).toMatchObject({ title: 'Верх тела', date: '2026-11-18' });
  });

  it('links library routine by slug', () => {
    expect(doc().workouts[0].blocks[0]).toEqual({ type: 'warmup', routine: 'neck-shoulders' });
  });

  it('declares new routine in routines and links it', () => {
    const d = doc(agent({ cooldown: { new_routine: { id: 'my-warm', title: 'Растяжка', exercises: [{ exercise_id: 'arm-circles', time_sec: 30 }] } } }));
    expect(d.routines[0]).toEqual({ id: 'my-warm', title: 'Растяжка', exercises: [{ exercise_id: 'arm-circles', time_sec: 30 }] });
    expect(d.workouts[0].blocks.at(-1)).toEqual({ type: 'cooldown', routine: 'my-warm' });
  });

  it('drops null fields', () => {
    // Строгий режим null не даёт, но клиент проверяет форму сам: null от модели не попадает в YAML
    const w = agent({ notes: null as unknown as string, blocks: [{ type: 'circuit', rounds: 3, title: null as unknown as string, exercises: [{ exercise_id: 'dips', reps: '12', weight_kg: null as unknown as number }] }] });
    expect(hasNull(doc(w))).toBe(false);
  });

  it('survives yaml special characters', () => {
    const w = agent({ title: 'Ноги: день #2 — «тяжёлый»', notes: 'строка 1\nстрока 2', blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', sets: 4, reps: '8', weight_kg: 60, notes: '"пауза" внизу: 1 с' }] }] });
    const r = parseImport(agentToImportYaml(w, '2026-11-18'), ctx);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.workouts[0]!.title).toBe('Ноги: день #2 — «тяжёлый»');
  });

  it('puts new exercises in exercises with explicit id', () => {
    const d = doc(agent({ new_exercises: [{ id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['грудь'], measure: 'reps', equipment: [], aliases: [] }] }));
    expect(d.exercises[0]).toMatchObject({ id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['грудь'], measure: 'reps' });
  });

  it('agentToImportYaml writes version 2 and parses', () => {
    // Строгая схема требует все поля у каждого блока: лишние для типа блока поля не попадают в YAML
    const w = agent({
      notes: 'Отдых по самочувствию',
      warmup: { new_routine: { id: 'my-warm', title: 'Своя разминка', exercises: [{ exercise_id: 'arm-circles', time_sec: 30, sides: ['вперёд', 'назад'] }, { exercise_id: 'dips', time_sec: 20, sides: [] }] } },
      cooldown: { routine: 'back-stretch' },
      blocks: [
        { type: 'sets', title: '', rounds: 1, rest_sec: 0, text: '', exercises: [{ exercise_id: 'bench-press', sets: 3, reps: '8-12', time_sec: 0, weight_kg: 60, rest_sec: 180, sides: [], notes: 'Пауза внизу' }] },
        { type: 'note', title: 'Тест большого пальца', rounds: 0, rest_sec: 0, text: 'Есть ли боль у основания пальца', exercises: [] },
        {
          type: 'circuit',
          title: 'Круг',
          rounds: 2,
          rest_sec: 90,
          text: 'лишнее',
          exercises: [
            { exercise_id: 'dips', sets: 1, reps: 'max', time_sec: 0, weight_kg: 0, rest_sec: 60, sides: [], notes: '' },
            { exercise_id: 'arm-circles', sets: 0, reps: '', time_sec: 'max', weight_kg: 0, rest_sec: 0, sides: ['влево', 'вправо'], notes: '' },
          ],
        },
        { type: 'timed', title: '', rounds: 3, rest_sec: 0, text: 'Без пауз', exercises: [{ exercise_id: 'arm-circles', sets: 1, reps: '', time_sec: 45, weight_kg: 0, rest_sec: 0, sides: [], notes: 'Плавно' }] },
      ],
    });
    const yaml = agentToImportYaml(w, '2026-11-18');
    const r = parseImport(yaml, ctx);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const d = parse(yaml);
    expect(d.version).toBe(2);
    expect(d.routines).toEqual([{ id: 'my-warm', title: 'Своя разминка', exercises: [{ exercise_id: 'arm-circles', time_sec: 30, sides: ['вперёд', 'назад'] }, { exercise_id: 'dips', time_sec: 20 }] }]);
    expect(d.workouts[0].notes).toBe('Отдых по самочувствию');
    expect(d.workouts[0].blocks).toEqual([
      { type: 'warmup', routine: 'my-warm' },
      { type: 'sets', exercises: [{ exercise_id: 'bench-press', sets: 3, reps: '8-12', weight_kg: 60, rest_sec: 180, notes: 'Пауза внизу' }] },
      { type: 'note', title: 'Тест большого пальца', text: 'Есть ли боль у основания пальца' },
      { type: 'circuit', title: 'Круг', rounds: 2, rest_sec: 90, exercises: [{ exercise_id: 'dips', reps: 'max' }, { exercise_id: 'arm-circles', time_sec: 'max', sides: ['влево', 'вправо'] }] },
      { type: 'timed', text: 'Без пауз', exercises: [{ exercise_id: 'arm-circles', time_sec: 45 }] },
      { type: 'cooldown', routine: 'back-stretch' },
    ]);
  });
});
