import { describe, expect, it, vi } from 'vitest';
import { AUDIO_CONSTRAINTS, clampZoom, formatZoom, openCamera, pickMimeType, zoomRange } from './recording';

describe('pickMimeType', () => {
  it('Chrome и Android: webm с vp9', () => {
    const chrome = (t: string) => t.startsWith('video/webm');
    expect(pickMimeType(chrome)).toBe('video/webm;codecs=vp9,opus');
  });

  it('Safari и iOS: только mp4', () => {
    const safari = (t: string) => t.startsWith('video/mp4');
    expect(pickMimeType(safari)).toBe('video/mp4;codecs=avc1,mp4a.40.2');
  });

  it('если нет vp9, берёт vp8, потом любой webm', () => {
    expect(pickMimeType((t) => t === 'video/webm;codecs=vp8,opus')).toBe('video/webm;codecs=vp8,opus');
    expect(pickMimeType((t) => t === 'video/webm')).toBe('video/webm');
  });

  it('ничего не поддерживается: undefined, браузер выберет сам', () => {
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});

describe('zoomRange', () => {
  it('зума нет или он фиксирован: null', () => {
    expect(zoomRange(undefined)).toBeNull();
    expect(zoomRange({})).toBeNull();
    expect(zoomRange({ min: 1, max: 1, step: 0.1 })).toBeNull();
  });

  it('есть диапазон: отдаёт его, шаг по умолчанию 0,1', () => {
    expect(zoomRange({ min: 1, max: 5, step: 0.5 })).toEqual({ min: 1, max: 5, step: 0.5 });
    expect(zoomRange({ min: 1, max: 5 })).toEqual({ min: 1, max: 5, step: 0.1 });
  });
});

describe('clampZoom', () => {
  const range = { min: 1, max: 5, step: 0.5 };

  it('не выходит за границы', () => {
    expect(clampZoom(0.2, range)).toBe(1);
    expect(clampZoom(9, range)).toBe(5);
  });

  it('округляет до шага от минимума', () => {
    expect(clampZoom(2.3, range)).toBe(2.5);
    expect(clampZoom(2.1, range)).toBe(2);
  });

  it('шаг 0,1 не копит ошибку плавающей точки', () => {
    expect(clampZoom(1.3, { min: 1, max: 3, step: 0.1 })).toBe(1.3);
  });
});

describe('formatZoom', () => {
  it('запятая и пробел перед знаком', () => {
    expect(formatZoom(1)).toBe('1,0 ×');
    expect(formatZoom(2.5)).toBe('2,5 ×');
  });
});

describe('openCamera', () => {
  const stream = { id: 'stream' } as unknown as MediaStream;
  const denied = () => new DOMException('denied', 'NotAllowedError');

  it('просит камеру вместе со звуком', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const result = await openCamera(getUserMedia, 'user');
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'user' } }, audio: AUDIO_CONSTRAINTS });
    expect(result).toEqual({ stream, withAudio: true });
  });

  it('микрофон не разрешён: пишем только видео и сообщаем об этом', async () => {
    const getUserMedia = vi.fn().mockRejectedValueOnce(denied()).mockResolvedValueOnce(stream);
    const result = await openCamera(getUserMedia, 'environment');
    expect(getUserMedia).toHaveBeenLastCalledWith({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    expect(result).toEqual({ stream, withAudio: false });
  });

  it('камера не разрешена: пробрасывает исходную ошибку', async () => {
    const first = denied();
    const getUserMedia = vi.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(new DOMException('x', 'NotFoundError'));
    await expect(openCamera(getUserMedia, 'environment')).rejects.toBe(first);
  });
});
