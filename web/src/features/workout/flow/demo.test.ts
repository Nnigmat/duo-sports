import { describe, expect, it } from 'vitest';
import { demoFor } from './demo';

const url = '/api/demo/a.mp4';

describe('demoFor', () => {
  it('в работе без записи отдаёт ролик', () => {
    expect(demoFor({ phase: 'work', record: false, demoUrl: url })).toBe(url);
  });
  it('на отдыхе ролика нет: чибик отдыхает', () => {
    expect(demoFor({ phase: 'rest', record: false, demoUrl: url })).toBeUndefined();
  });
  it('на шаге записи чибик держит камеру, ролика нет', () => {
    expect(demoFor({ phase: 'work', record: true, demoUrl: url })).toBeUndefined();
  });
  it('без ролика у упражнения остаётся статичный чибик', () => {
    expect(demoFor({ phase: 'work', record: false })).toBeUndefined();
  });
});
