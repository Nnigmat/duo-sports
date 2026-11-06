import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDraft, saveDraft, clearDraft } from './draftStorage';
import { buildSteps, initSession, reduce, type Draft } from './flow';
import { circuit, warmup } from './flow/fixtures';

const NOW = 1_000_000_000;
const draft: Draft = {
  session: reduce(initSession(buildSteps([warmup, circuit])), { type: 'begin' }),
  startedAt: NOW - 5000,
  updatedAt: NOW - 1000,
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

describe('draftStorage', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('сохраняет и читает черновик', () => {
    saveDraft('k', draft);
    expect(loadDraft('k', NOW)).toEqual(draft);
  });

  it('нет записи — null', () => {
    expect(loadDraft('k', NOW)).toBeNull();
  });

  it('clearDraft удаляет запись', () => {
    saveDraft('k', draft);
    clearDraft('k');
    expect(loadDraft('k', NOW)).toBeNull();
    expect(storage.data.has('k')).toBe(false);
  });

  it('повреждённую запись удаляет при чтении', () => {
    storage.data.set('k', '{oops');
    expect(loadDraft('k', NOW)).toBeNull();
    expect(storage.data.has('k')).toBe(false);
  });

  it('устаревшую запись удаляет при чтении', () => {
    saveDraft('k', { ...draft, updatedAt: 0 });
    expect(loadDraft('k', NOW)).toBeNull();
    expect(storage.data.has('k')).toBe(false);
  });

  it('черновики разных ключей не мешают друг другу', () => {
    saveDraft('a', draft);
    saveDraft('b', { ...draft, startedAt: NOW - 9000 });
    clearDraft('a');
    expect(loadDraft('b', NOW)?.startedAt).toBe(NOW - 9000);
  });

  it('недоступное хранилище не ломает тренировку', () => {
    const broken = () => {
      throw new Error('SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: broken, setItem: broken, removeItem: broken });
    expect(() => saveDraft('k', draft)).not.toThrow();
    expect(() => clearDraft('k')).not.toThrow();
    expect(loadDraft('k', NOW)).toBeNull();
  });
});
