import { describe, expect, it } from 'vitest';
import { pickDemo } from './demo';

const both = { female: 'f.mp4', male: 'm.mp4' };

describe('pickDemo', () => {
  it('девочке отдаёт женский ролик', () => expect(pickDemo('female', both)).toBe('f.mp4'));
  it('мальчику отдаёт мужской ролик', () => expect(pickDemo('male', both)).toBe('m.mp4'));
  it('если ролика своего пола нет, берёт чужой', () => {
    expect(pickDemo('female', { male: 'm.mp4' })).toBe('m.mp4');
    expect(pickDemo('male', { female: 'f.mp4' })).toBe('f.mp4');
  });
  it('без пола при двух роликах берёт женский', () => expect(pickDemo(undefined, both)).toBe('f.mp4'));
  it('без роликов возвращает undefined', () => {
    expect(pickDemo('male', {})).toBeUndefined();
    expect(pickDemo('male', undefined)).toBeUndefined();
  });
});
