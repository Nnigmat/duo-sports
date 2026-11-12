import { describe, expect, it } from 'vitest';
import { draftFromYaml, draftToYaml } from './routineYaml';
import { emptyDraft, newItem } from './routines';

const lib = [{ id: 'plank', name: 'Планка' }, { id: 'lunge', name: 'Выпад' }];

describe('YAML разминки', () => {
  it('круг: черновик → текст → черновик', () => {
    const d = emptyDraft('warmup');
    d.title = 'Ноги';
    d.note = 'Медленно';
    d.items = [{ ...newItem('plank', 'Планка'), min: '30', max: '45' }, { ...newItem('lunge', 'Выпад'), sides: true }];
    const text = draftToYaml(d);
    expect(text).toContain('sec: 30-45');
    expect(text).toContain('sides:');
    const r = draftFromYaml(text, lib, d);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.title).toBe('Ноги');
      expect(r.draft.items.map((i) => [i.exercise, i.min, i.max, i.sides])).toEqual([['plank', '30', '45', false], ['lunge', '30', '30', true]]);
    }
  });
  it('собирает все ошибки', () => {
    const r = draftFromYaml('kind: x\nexercises:\n  - exercise: nope\n    sec: 70-5', lib, { kind: 'warmup' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.message)).toEqual(['kind: warmup или cooldown', 'Нет названия (title)', 'Упражнение 1: нет упражнения на время «nope»', 'Упражнение 1: начало диапазона больше конца']);
  });
  it('битый YAML даёт номер строки', () => {
    const r = draftFromYaml('title: [a\nkind: warmup', lib, { kind: 'warmup' });
    expect(r.ok).toBe(false);
  });
});
