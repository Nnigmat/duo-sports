import { describe, expect, it } from 'vitest';
import { libraryFixture } from './fixtures';
import type { LibraryEntry } from '../../../../shared/types';
import { exerciseYaml, referenceHeader, referenceList, referenceYamlFile, sourceStatus, SAMPLE_YAML } from './import';

const squat = { ...libraryFixture[0], id: 'barbell-squat', name: 'Приседания со штангой', aliases: ['присед'], group: 'legs', kind: 'weight', muscles: ['Квадрицепс', 'Ягодицы'] } as LibraryEntry;
const pullUp = { ...libraryFixture[0], id: 'pull-up', name: 'Подтягивания', group: 'back', kind: 'reps', muscles: ['Широчайшие'] } as LibraryEntry;
const list = [squat, pullUp];

describe('sourceStatus', () => {
  it('пустой текст — пустая строка', () => {
    expect(sourceStatus('')).toBe('');
    expect(sourceStatus('  \n ')).toBe('');
  });
  it('считает строки без хвостовых переводов и склоняет', () => {
    expect(sourceStatus('a')).toBe('Вставлено 1 строка');
    expect(sourceStatus('a\nb\n\n')).toBe('Вставлено 2 строки');
    expect(sourceStatus('1\n2\n3\n4\n5')).toBe('Вставлено 5 строк');
  });
  it('пример непустой и начинается с version', () => {
    expect(SAMPLE_YAML.startsWith('version: 1')).toBe(true);
    expect(sourceStatus(SAMPLE_YAML)).toMatch(/^Вставлено \d+ /);
  });
});

describe('referenceList', () => {
  it('без условий отдаёт всё', () => {
    expect(referenceList(list, '', 'all')).toEqual(list);
  });
  it('ищет по названию, id и алиасу без учёта регистра', () => {
    expect(referenceList(list, 'ПОДТЯГ', 'all')).toEqual([pullUp]);
    expect(referenceList(list, 'barbell', 'all')).toEqual([squat]);
    expect(referenceList(list, 'присед', 'all')).toEqual([squat]);
  });
  it('фильтрует по группе вместе с поиском', () => {
    expect(referenceList(list, '', 'back')).toEqual([pullUp]);
    expect(referenceList(list, 'присед', 'back')).toEqual([]);
  });
});

describe('exerciseYaml', () => {
  it('пишет id, название, алиасы, мышцы и measure', () => {
    expect(exerciseYaml(squat)).toBe(
      ['  - id: barbell-squat', '    name: Приседания со штангой', '    aliases: [присед]', '    muscles: [квадрицепс, ягодицы]', '    measure: weight'].join('\n'),
    );
  });
  it('без алиасов строки aliases нет, у своего упражнения есть пометка', () => {
    const text = exerciseYaml(pullUp, true);
    expect(text).not.toContain('aliases');
    expect(text.endsWith('    # своё')).toBe(true);
  });
  it('файл начинается с exercises: и содержит все упражнения', () => {
    const file = referenceYamlFile(list);
    expect(file.startsWith('exercises:\n')).toBe(true);
    expect(file).toContain('id: pull-up');
  });
});

describe('referenceHeader', () => {
  it('все упражнения — просто число', () => {
    expect(referenceHeader(31, 31)).toBe('31 упражнение');
    expect(referenceHeader(5, 5)).toBe('5 упражнений');
  });
  it('часть — «Показано N из M»', () => {
    expect(referenceHeader(9, 31)).toBe('Показано 9 из 31 упражнения');
    expect(referenceHeader(2, 12)).toBe('Показано 2 из 12 упражнений');
  });
});
