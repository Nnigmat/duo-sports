import express from 'express';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { videosRouter } from './videos';

let dir: string;
let server: Server;
let base: string;

async function start(maxBytes = 1024) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videos-'));
  const app = express();
  app.use('/api', videosRouter({ dir, maxBytes }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/videos`;
}

const post = (body: BodyInit | null, type?: string) =>
  fetch(base, { method: 'POST', body, headers: type ? { 'content-type': type } : {} });

beforeEach(() => start());
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('POST /api/videos', () => {
  it('сохраняет тело запроса в файл и возвращает id и путь', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const res = await post(bytes, 'video/webm');
    expect(res.status).toBe(201);
    const { id, path: p } = await res.json();
    expect(p).toBe(`videos/${id}.webm`);
    expect(new Uint8Array(fs.readFileSync(path.join(dir, `${id}.webm`)))).toEqual(bytes);
  });

  it('расширение берётся из типа, параметры codecs игнорируются', async () => {
    const mp4 = await (await post(new Uint8Array([1]), 'video/mp4;codecs=avc1')).json();
    expect(mp4.path).toMatch(/\.mp4$/);
    const webm = await (await post(new Uint8Array([1]), 'video/webm;codecs=vp9,opus')).json();
    expect(webm.path).toMatch(/\.webm$/);
  });

  it('чужой тип: 415 и ничего не сохранено', async () => {
    const res = await post(new Uint8Array([1]), 'text/plain');
    expect(res.status).toBe(415);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('без типа: 415', async () => {
    const res = await post(new Uint8Array([1]));
    expect(res.status).toBe(415);
  });

  it('пустое тело: 400 и файла нет', async () => {
    const res = await post(new Uint8Array([]), 'video/webm');
    expect(res.status).toBe(400);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('больше лимита: 413 и недописанный файл удалён', async () => {
    const res = await post(new Uint8Array(2048), 'video/webm');
    expect(res.status).toBe(413);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('каждая загрузка получает свой id', async () => {
    const a = await (await post(new Uint8Array([1]), 'video/webm')).json();
    const b = await (await post(new Uint8Array([1]), 'video/webm')).json();
    expect(a.id).not.toBe(b.id);
    expect(fs.readdirSync(dir)).toHaveLength(2);
  });
});
