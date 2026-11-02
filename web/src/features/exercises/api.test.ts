import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LibraryEntry } from '../../../../shared/types';
import { createExercise, deleteExercise, mergeEntry, toLibraryExercise, updateExercise } from './api';
import { draftFromExercise, emptyDraft } from './library';
import { squat } from './mock';

describe('toLibraryExercise', () => {
  it('дополняет запись сервера полями экрана', () => {
    const ex = toLibraryExercise({ id: 'plank', name: 'Планка', aliases: [], kind: 'time', group: 'core', muscles: ['пресс'] });
    expect(ex).toMatchObject({ id: 'plank', kind: 'time', group: 'core', sessionsTotal: 0, sessions: [], trend: [] });
    expect(ex.defaults.seconds).toBeGreaterThan(0);
  });

  it('переносит шаги и видео, пустые превращает в отсутствующие', () => {
    const e: LibraryEntry = { id: 'a', name: 'А', aliases: [], kind: 'reps', group: 'core', muscles: [] };
    expect(toLibraryExercise({ ...e, notes: 'Раз\nДва', video: 'https://x.ru/v' })).toMatchObject({ notes: 'Раз\nДва', video: 'https://x.ru/v' });
    expect(toLibraryExercise({ ...e, notes: '', video: '' }).notes).toBeUndefined();
  });
});

function mockFetch(res: Response | null) {
  const fn = vi.fn(async () => {
    if (!res) throw new TypeError('network');
    return res;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
const json = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('createExercise', () => {
  it('шлёт POST с телом ExerciseInput и возвращает упражнение с локальными полями', async () => {
    const fn = mockFetch(json(201, { id: 'most', name: 'Мост', aliases: [], kind: 'reps', group: 'legs', muscles: ['Ягодицы'], notes: 'Лягте' }));
    const draft = { ...emptyDraft(), name: ' Мост ', kind: 'reps' as const, muscles: ['Ягодицы'], equipment: 'Гиря', notes: 'Лягте' };
    const ex = await createExercise(draft);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/exercises');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Мост', group: 'legs', kind: 'reps', muscles: ['Ягодицы'], aliases: [], notes: 'Лягте', video: '' });
    expect(ex).toMatchObject({ id: 'most', notes: 'Лягте', equipment: 'Гиря' });
  });

  it('берёт сообщение из тела {error}', async () => {
    mockFetch(json(409, { error: 'Такое упражнение уже есть' }));
    await expect(createExercise({ ...emptyDraft(), name: 'Мост' })).rejects.toThrow('Такое упражнение уже есть');
  });

  it('без тела ошибки пишет по статусу', async () => {
    mockFetch(json(403));
    await expect(createExercise({ ...emptyDraft(), name: 'Мост' })).rejects.toThrow('Упражнения меняют тренер и админ');
    mockFetch(json(500));
    await expect(createExercise({ ...emptyDraft(), name: 'Мост' })).rejects.toThrow('Сервер ответил 500');
  });

  it('при обрыве связи сообщает об этом', async () => {
    mockFetch(null);
    await expect(createExercise({ ...emptyDraft(), name: 'Мост' })).rejects.toThrow('Нет связи с сервером');
  });
});

describe('updateExercise', () => {
  it('шлёт PATCH по id; история и параметры остаются, шаги очищаются', async () => {
    const fn = mockFetch(json(200, { id: squat.id, name: 'Присед', aliases: [], kind: squat.kind, group: squat.group, muscles: squat.muscles }));
    const ex = { ...squat, notes: 'Старое' };
    const draft = { ...draftFromExercise(ex), name: 'Присед', notes: '', equipment: 'Штанга' };
    const next = await updateExercise(ex, draft);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/exercises/${squat.id}`);
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ name: 'Присед', notes: '' });
    expect(body).not.toHaveProperty('muscles');
    expect(next.notes).toBeUndefined();
    expect(next.sessions).toBe(squat.sessions);
  });

  it('404 из тела или по статусу', async () => {
    mockFetch(json(404));
    await expect(updateExercise(squat, draftFromExercise(squat))).rejects.toThrow('Упражнение не найдено');
  });
});

describe('deleteExercise', () => {
  it('шлёт DELETE и принимает 204', async () => {
    const fn = mockFetch(json(204));
    await deleteExercise('a b');
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/exercises/a%20b');
    expect(init.method).toBe('DELETE');
  });
  it('ошибка сервера', async () => {
    mockFetch(json(500, { error: 'Сбой' }));
    await expect(deleteExercise('a')).rejects.toThrow('Сбой');
  });
});

describe('mergeEntry', () => {
  it('сохраняет историю', () => {
    const out = mergeEntry(squat, { id: squat.id, name: 'Новое', aliases: [], kind: 'weight', group: 'legs', muscles: ['Ноги'] });
    expect(out.name).toBe('Новое');
    expect(out.sessions).toBe(squat.sessions);
  });
});
