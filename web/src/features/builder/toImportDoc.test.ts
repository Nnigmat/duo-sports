import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseImport } from '../import/parse';
import { agent, ctx } from './testkit';
import { agentToImportYaml } from './toImportDoc';

const doc = (w = agent()) => parse(agentToImportYaml(w, '2026-11-18'));

const hasNull = (v: unknown): boolean =>
  v === null || (Array.isArray(v) ? v.some(hasNull) : typeof v === 'object' && v !== null ? Object.values(v).some(hasNull) : false);

describe('agentToImportYaml', () => {
  it('builds one workout on the date with version 1', () => {
    const d = doc();
    expect(d.version).toBe(1);
    expect(d.workouts).toHaveLength(1);
    expect(d.workouts[0]).toMatchObject({ title: 'Верх тела', date: '2026-11-18' });
  });

  it('links library routine by slug', () => {
    expect(doc().workouts[0].blocks[0]).toEqual({ type: 'warmup', routine: 'neck-shoulders' });
  });

  it('declares new routine in routines and links it', () => {
    const d = doc(agent({ cooldown: { new_routine: { id: 'my-warm', title: 'Растяжка', exercises: [{ exercise_id: 'arm-circles', time: '30s' }] } } }));
    expect(d.routines[0]).toMatchObject({ id: 'my-warm', title: 'Растяжка', exercises: [{ exercise_id: 'arm-circles', time: '30s' }] });
    expect(d.workouts[0].blocks.at(-1)).toEqual({ type: 'cooldown', routine: 'my-warm' });
  });

  it('drops null fields', () => {
    // Строгий режим null не даёт, но клиент проверяет форму сам: null от модели не попадает в YAML
    const w = agent({ notes: null as unknown as string, blocks: [{ type: 'circuit', rounds: 3, title: null as unknown as string, exercises: [{ name: 'Отжимания на брусьях', reps: '12', weight: null as unknown as string }] }] });
    expect(hasNull(doc(w))).toBe(false);
  });

  it('survives yaml special characters', () => {
    const w = agent({ title: 'Ноги: день #2 — «тяжёлый»', notes: 'строка 1\nстрока 2', blocks: [{ type: 'sets', exercises: [{ exercise_id: 'bench-press', do: '4x8 @ 60', notes: '"пауза" внизу: 1 с' }] }] });
    const r = parseImport(agentToImportYaml(w, '2026-11-18'), ctx);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.workouts[0]!.title).toBe('Ноги: день #2 — «тяжёлый»');
  });

  it('puts new exercises in exercises with explicit id', () => {
    const d = doc(agent({ new_exercises: [{ id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['грудь'], measure: 'reps', equipment: [], aliases: [] }] }));
    expect(d.exercises[0]).toMatchObject({ id: 'clap-pushup', name: 'Отжимания с хлопком', muscles: ['грудь'], measure: 'reps' });
  });
});
