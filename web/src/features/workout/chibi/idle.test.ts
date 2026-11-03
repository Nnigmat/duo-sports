import { describe, expect, it } from 'vitest';
import { cameraUrl, idleUrl, restUrl, successUrl } from './idle';

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

describe('cameraUrl', () => {
  it('даёт мальчика и девочку по полу', () => {
    expect(cameraUrl('male')).toContain('camera-boy');
    expect(cameraUrl('female')).toContain('camera-girl');
  });

  it('без пола — девочка', () => {
    expect(cameraUrl()).toBe(cameraUrl('female'));
  });
});

describe('successUrl', () => {
  it('даёт мальчика и девочку по полу', () => {
    expect(successUrl('male')).toContain('success-boy');
    expect(successUrl('female')).toContain('success-girl');
  });

  it('без пола — девочка', () => {
    expect(successUrl()).toBe(successUrl('female'));
  });
});
