import { describe, expect, it } from 'vitest';
import { pickMimeType } from './recording';

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
