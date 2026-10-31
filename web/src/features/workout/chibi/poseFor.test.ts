import { describe, expect, it } from 'vitest';
import { POSES, poseFor } from './poseFor';

describe('poseFor', () => {
  it('подход: поза упражнения', () => {
    expect(poseFor({ phase: 'work', exercisePose: 'dips' })).toBe('dips');
  });

  it('подход без позы у упражнения: стоит', () => {
    expect(poseFor({ phase: 'work' })).toBe('stand');
  });

  it('подход с записью: держит камеру, а не позу упражнения', () => {
    expect(poseFor({ phase: 'work', exercisePose: 'dips', record: true })).toBe('camera');
  });

  it('отдых, старт и финиш: служебные позы', () => {
    expect(poseFor({ phase: 'rest', exercisePose: 'dips' })).toBe('rest');
    expect(poseFor({ phase: 'start' })).toBe('stand');
    expect(poseFor({ phase: 'finish' })).toBe('cheer');
  });

  it('отдых важнее камеры', () => {
    expect(poseFor({ phase: 'rest', record: true })).toBe('rest');
  });

  it('в списке поз 12 уникальных', () => {
    expect(new Set(POSES).size).toBe(13);
  });
});
