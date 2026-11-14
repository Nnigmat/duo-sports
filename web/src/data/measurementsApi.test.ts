import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMeasurements, saveMeasurement } from './api';

const stub = (impl: (url: string, init?: RequestInit) => Promise<Response> | Response) => {
  const fn = vi.fn(async (url: string, init?: RequestInit) => impl(url, init));
  vi.stubGlobal('fetch', fn);
  return fn;
};
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('fetchMeasurements', () => {
  it('без athleteId читает свои замеры', async () => {
    const fn = stub(() => jsonResponse({ entries: [] }));
    expect(await fetchMeasurements()).toEqual({ entries: [] });
    expect(fn.mock.calls[0][0]).toBe('/api/measurements');
  });

  it('с athleteId читает замеры ученика по тренерскому адресу', async () => {
    const fn = stub(() => jsonResponse({ entries: [{ date: '2026-11-14', values: { weight: 72 } }] }));
    const r = await fetchMeasurements(7);
    expect(fn.mock.calls[0][0]).toBe('/api/trainer/athletes/7/measurements');
    expect(r.entries).toHaveLength(1);
  });

  it('понятные ошибки: нет связи, сессия, нет доступа, прочее', async () => {
    stub(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(fetchMeasurements()).rejects.toThrow('Нет связи с сервером');
    stub(() => jsonResponse({}, 401));
    await expect(fetchMeasurements()).rejects.toThrow('Сессия закончилась: войдите заново');
    stub(() => jsonResponse({}, 403));
    await expect(fetchMeasurements(7)).rejects.toThrow('Нет доступа к этому ученику');
    stub(() => jsonResponse({}, 500));
    await expect(fetchMeasurements()).rejects.toThrow('Сервер ответил 500');
  });
});

describe('saveMeasurement', () => {
  const entry = { date: '2026-11-14', values: { weight: 72 } };

  it('шлёт POST с JSON', async () => {
    const fn = stub(() => new Response(null, { status: 204 }));
    await saveMeasurement(entry);
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('/api/measurements');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual(entry);
  });

  it('400 бросает Error с текстом сервера', async () => {
    stub(() => jsonResponse({ error: 'Плохое значение' }, 400));
    await expect(saveMeasurement(entry)).rejects.toThrow('Плохое значение');
  });

  it('400 без JSON даёт общий текст, а не падает на разборе', async () => {
    stub(() => new Response('<html></html>', { status: 400 }));
    await expect(saveMeasurement(entry)).rejects.toThrow('Не удалось сохранить замер');
  });

  it('сетевая ошибка и 401 — понятные сообщения', async () => {
    stub(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(saveMeasurement(entry)).rejects.toThrow('Нет связи с сервером');
    stub(() => jsonResponse({}, 401));
    await expect(saveMeasurement(entry)).rejects.toThrow('Сессия закончилась: войдите заново');
  });
});
