import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILDER_TTL_MS, builderKey, clearBuilder, loadBuilder, parseBuilder, saveBuilder, serializeBuilder, type StoredBuilder } from './storage';
import type { BuilderDraft } from './types';

const NOW = 1_800_000_000_000;
const draft: BuilderDraft = {
  date: '2026-11-18',
  title: 'Верх',
  blocks: [{ id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'e1', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 4 }] }],
  newExercises: [{ name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['грудь'], kind: 'reps', equipment: [], notes: '', aliases: [] }],
  warmup: { kind: 'library', slug: 'neck-shoulders' },
  cooldown: { kind: 'new', title: 'Растяжка', items: [{ name: 'Вращение руками', sec: 30, sides: ['вправо', 'влево'] }] },
  advice: [{ id: 'a0', text: 'Есть похожее', exercise: 'Отжимания с хлопком', suggest: 'Отжимания на брусьях' }],
  marks: { 'b1-e1': { blockIndex: 0, exerciseIndex: 0, field: 'reps', wrote: 'до отказа', message: 'Не понимаю reps: до отказа' } },
  unparsed: [{ what: 'bench-pres', message: 'Неизвестный exercise_id: bench-pres' }],
};
const stored: StoredBuilder = {
  v: 2,
  savedAt: NOW - 1000,
  step: 'review',
  input: { title: '', warmup: { kind: 'library', slug: 'neck-shoulders' }, main: { text: 'жим', picked: ['bench-press'] }, cooldown: { kind: 'text', text: 'растяжка' } },
  draft,
};

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('разбор сохранённого черновика', () => {
  it('round-trips input and draft', () => {
    expect(parseBuilder(serializeBuilder(stored), NOW)).toEqual(stored);
    const inputOnly: StoredBuilder = { ...stored, step: 'input', draft: null };
    expect(parseBuilder(serializeBuilder(inputOnly), NOW)).toEqual(inputOnly);
  });

  it('rejects other version', () => {
    expect(parseBuilder(JSON.stringify({ ...stored, v: 3 }), NOW)).toBeNull();
  });

  it('old draft version is discarded', () => {
    // Черновик до пометок: та же форма без marks и unparsed
    const { marks: _m, unparsed: _u, ...old } = draft;
    expect(parseBuilder(JSON.stringify({ ...stored, v: 1, draft: old }), NOW)).toBeNull();
    expect(parseBuilder(JSON.stringify({ ...stored, draft: { ...draft, marks: [] } }), NOW)).toBeNull();
  });

  it('rejects older than 7 days', () => {
    expect(parseBuilder(serializeBuilder({ ...stored, savedAt: NOW - BUILDER_TTL_MS - 1 }), NOW)).toBeNull();
    expect(parseBuilder(serializeBuilder({ ...stored, savedAt: NOW - BUILDER_TTL_MS + 1 }), NOW)).not.toBeNull();
  });

  it('rejects broken json', () => {
    expect(parseBuilder('{"v":1,', NOW)).toBeNull();
    expect(parseBuilder(null, NOW)).toBeNull();
  });

  it('rejects wrong shape', () => {
    expect(parseBuilder(JSON.stringify({ v: 1 }), NOW)).toBeNull();
    expect(parseBuilder(JSON.stringify({ ...stored, step: 'done' }), NOW)).toBeNull();
    expect(parseBuilder(JSON.stringify({ ...stored, input: { ...stored.input, warmup: { kind: 'yoga' } } }), NOW)).toBeNull();
    expect(parseBuilder(JSON.stringify({ ...stored, draft: { ...draft, blocks: 'нет' } }), NOW)).toBeNull();
    // Шаг проверки без черновика восстановить нечем
    expect(parseBuilder(JSON.stringify({ ...stored, draft: null }), NOW)).toBeNull();
  });

  it('keys differ by athlete and date', () => {
    const keys = new Set([builderKey(1, null, '2026-11-18'), builderKey(1, 5, '2026-11-18'), builderKey(1, 5, '2026-11-19'), builderKey(2, 5, '2026-11-19')]);
    expect(keys.size).toBe(4);
    expect(builderKey(1, null, '2026-11-18')).toBe('duo-builder:1:own:2026-11-18');
  });
});

describe('хранилище', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('saves, loads and clears', () => {
    saveBuilder('k', stored);
    expect(loadBuilder('k', NOW)).toEqual(stored);
    clearBuilder('k');
    expect(storage.data.has('k')).toBe(false);
  });

  it('old version record is removed on load', () => {
    storage.data.set('k', JSON.stringify({ ...stored, v: 1 }));
    expect(loadBuilder('k', NOW)).toBeNull();
    expect(storage.data.has('k')).toBe(false);
  });

  it('broken record is removed on load', () => {
    storage.data.set('k', '{oops');
    expect(loadBuilder('k', NOW)).toBeNull();
    expect(storage.data.has('k')).toBe(false);
  });

  it('works without storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(loadBuilder('k', NOW)).toBeNull();
    expect(() => saveBuilder('k', stored)).not.toThrow();
    expect(() => clearBuilder('k')).not.toThrow();
  });
});
