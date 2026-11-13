import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseHistory, LibraryEntry } from '../../../../shared/types';
import { createExercise, deleteDemo, deleteExercise, fetchLibrary, mergeEntry, toLibraryExercise, updateExercise, uploadDemo, withHistory } from './api';
import { draftFromExercise, emptyDraft } from './library';
import { squat } from './mock';

describe('toLibraryExercise', () => {
  it('дополняет запись сервера полями экрана', () => {
    const ex = toLibraryExercise({ id: 'plank', name: 'Планка', aliases: [], kind: 'time', group: 'core', muscles: ['пресс'], equipment: [] });
    expect(ex).toMatchObject({ id: 'plank', kind: 'time', group: 'core', sessionsTotal: 0, sessions: [], trend: [] });
    expect(ex.defaults.seconds).toBeGreaterThan(0);
  });

  it('переносит шаги и ролики, пустые превращает в отсутствующие', () => {
    const e: LibraryEntry = { id: 'a', name: 'А', aliases: [], kind: 'reps', group: 'core', muscles: [], equipment: [] };
    expect(toLibraryExercise({ ...e, notes: 'Раз\nДва', demo: { female: 'f.mp4' } })).toMatchObject({ notes: 'Раз\nДва', demo: { female: 'f.mp4' } });
    expect(toLibraryExercise({ ...e, notes: '' }).notes).toBeUndefined();
    expect(toLibraryExercise(e).demo).toBeUndefined();
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
    const fn = mockFetch(json(201, { id: 'most', name: 'Мост', aliases: [], kind: 'reps', group: 'legs', muscles: ['Ягодицы'], equipment: ['Гиря'], notes: 'Лягте' }));
    const draft = { ...emptyDraft(), name: ' Мост ', kind: 'reps' as const, muscles: ['Ягодицы'], equipment: ['Гиря'], notes: 'Лягте' };
    const ex = await createExercise(draft);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/exercises');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Мост', group: 'legs', kind: 'reps', muscles: ['Ягодицы'], aliases: [], equipment: ['Гиря'], notes: 'Лягте' });
    expect(ex).toMatchObject({ id: 'most', notes: 'Лягте', equipment: ['Гиря'] });
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
    const draft = { ...draftFromExercise(ex), name: 'Присед', notes: '', equipment: ['Штанга'] };
    const next = await updateExercise(ex, draft);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/exercises/${squat.id}`);
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ name: 'Присед', notes: '', equipment: ['Штанга'] });
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
    const out = mergeEntry(squat, { id: squat.id, name: 'Новое', aliases: [], kind: 'weight', group: 'legs', muscles: ['Ноги'], equipment: [] });
    expect(out.name).toBe('Новое');
    expect(out.sessions).toBe(squat.sessions);
  });
});

describe('uploadDemo / deleteDemo', () => {
  const entry = { id: 'plank', name: 'Планка', aliases: [], kind: 'time', group: 'core', muscles: [], demo: { female: 'f.mp4' } };

  it('PUT с файлом как телом и его типом; возвращает ролики', async () => {
    const fn = mockFetch(json(200, entry));
    const file = new File([new Uint8Array([1, 2])], 'a.mp4', { type: 'video/mp4' });
    const demo = await uploadDemo('plank', 'female', file);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/exercises/plank/demo/female');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(file);
    expect(new Headers(init.headers).get('content-type')).toBe('video/mp4');
    expect(demo).toEqual({ female: 'f.mp4' });
  });
  it('ответ без роликов даёт пустой объект; DELETE шлёт на тот же адрес', async () => {
    const fn = mockFetch(json(200, { ...entry, demo: undefined }));
    expect(await deleteDemo('plank', 'male')).toEqual({});
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/exercises/plank/demo/male');
    expect(init.method).toBe('DELETE');
  });
  it('413 и 415 приходят текстом сервера', async () => {
    mockFetch(json(413, { error: 'Видео слишком большое' }));
    await expect(uploadDemo('plank', 'male', new File([''], 'a.mp4', { type: 'video/mp4' }))).rejects.toThrow('Видео слишком большое');
  });
});

const entry = (id: string, kind: LibraryEntry['kind']): LibraryEntry => ({ id, name: id, aliases: [], kind, group: 'legs', muscles: [], equipment: [] });

describe('withHistory', () => {
  const h = (o: Partial<ExerciseHistory> & Pick<ExerciseHistory, 'id'>): ExerciseHistory => ({
    record: { value: 1, date: '2026-10-12' }, sessionsTotal: 1, sessions: [], trend: [], ...o,
  });

  it('вес × повторы: рекорд, тренировки с датами «12 окт» и тренд', () => {
    const base = toLibraryExercise(entry('sq', 'weight'));
    const ex = withHistory(base, h({
      id: 'sq', record: { weight: 85, value: 5, date: '2026-10-12' }, sessionsTotal: 3, trend: [80, 85],
      sessions: [{ date: '2026-10-20', sets: [{ weight: 80, value: 8 }] }, { date: '2026-10-12', sets: [{ weight: 85, value: 5 }], isRecord: true }],
    }));
    expect(ex.record).toEqual({ weight: 85, reps: 5, date: '12 окт' });
    expect(ex.sessionsTotal).toBe(3);
    expect(ex.trend).toEqual([80, 85]);
    expect(ex.sessions).toEqual([
      { date: '20 окт', sets: [{ weight: 80, reps: 8 }], videos: [], comments: [] },
      { date: '12 окт', sets: [{ weight: 85, reps: 5 }], isRecord: true, videos: [], comments: [] },
    ]);
  });

  it('время подхода и упражнения переносится, без меток полей нет', () => {
    const base = toLibraryExercise(entry('sq', 'weight'));
    const ex = withHistory(base, h({
      id: 'sq', typicalSetSec: 45,
      sessions: [{ date: '2026-10-20', sets: [{ weight: 80, value: 8, timeSec: 40 }, { weight: 80, value: 8, timeSec: 50 }], totalSec: 90 }, { date: '2026-10-12', sets: [{ weight: 80, value: 8 }] }],
    }));
    expect(ex.typicalSetSec).toBe(45);
    expect(ex.sessions[0]).toMatchObject({ totalSec: 90, sets: [{ weight: 80, reps: 8, timeSec: 40 }, { weight: 80, reps: 8, timeSec: 50 }] });
    expect(ex.sessions[1]).not.toHaveProperty('totalSec');
    expect(ex.sessions[1]!.sets[0]).not.toHaveProperty('timeSec');
    expect(withHistory(base, h({ id: 'sq' }))).not.toHaveProperty('typicalSetSec');
  });

  it('повторы и время кладутся в своё поле', () => {
    const reps = withHistory(toLibraryExercise(entry('p', 'reps')), h({ id: 'p', record: { value: 20, date: '2026-10-05' }, sessions: [{ date: '2026-10-05', sets: [{ value: 20 }] }] }));
    expect(reps.record).toEqual({ reps: 20, date: '5 окт' });
    const time = withHistory(toLibraryExercise(entry('t', 'time')), h({ id: 't', record: { value: 95, date: '2026-10-05' }, sessions: [{ date: '2026-10-05', sets: [{ value: 95 }] }] }));
    expect(time.record).toEqual({ seconds: 95, date: '5 окт' });
    expect(time.sessions[0]!.sets).toEqual([{ seconds: 95 }]);
  });

  it('без истории упражнение остаётся новым', () => {
    const base = toLibraryExercise(entry('x', 'reps'));
    expect(withHistory(base, undefined)).toBe(base);
  });
});

describe('fetchLibrary', () => {
  const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const stub = (history: Response | null) =>
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/exercises') return res({ exercises: [entry('sq', 'weight'), entry('new', 'reps')] });
      if (!history) throw new TypeError('network');
      return history;
    }));

  it('подмешивает историю к упражнениям, которые выполнялись', async () => {
    stub(res({ history: [{ id: 'sq', record: { weight: 85, value: 5, date: '2026-10-12' }, sessionsTotal: 1, sessions: [], trend: [85] }] }));
    const list = await fetchLibrary();
    expect(list.find((e) => e.id === 'sq')!.record).toEqual({ weight: 85, reps: 5, date: '12 окт' });
    expect(list.find((e) => e.id === 'new')!.record).toBeUndefined();
  });

  it('если история не загрузилась, список всё равно показывается', async () => {
    stub(res({}, 500));
    expect((await fetchLibrary()).map((e) => e.id)).toEqual(['sq', 'new']);
    stub(null);
    expect(await fetchLibrary()).toHaveLength(2);
  });
});
