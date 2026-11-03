import { describe, expect, it } from 'vitest';
import { idleUrl, restUrl } from './idle';

describe('idleUrl', () => {
  it('даёт мальчика и девочку по полу', () => {
    expect(idleUrl('male')).toContain('idle-boy');
    expect(idleUrl('female')).toContain('idle-girl');
  });

  it('без пола — девочка', () => {
    expect(idleUrl()).toBe(idleUrl('female'));
  });
});

describe('restUrl', () => {
  it('даёт мальчика и девочку по полу', () => {
    expect(restUrl('male')).toContain('rest-boy');
    expect(restUrl('female')).toContain('rest-girl');
  });

  it('без пола — девочка', () => {
    expect(restUrl()).toBe(restUrl('female'));
  });
});
