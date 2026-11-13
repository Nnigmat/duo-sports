import { beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseKind } from '../shared/types';
import { openDb, type Db } from './db';
import { createExercise, updateExercise } from './exercises';
import { guessEquipment, migrateEquipment } from './migrateEquipment';
import { libraryOf } from './imports';

describe('guessEquipment', () => {
  const g = guessEquipment;
  it('штанга, гантели, гиря, турник, скакалка', () => {
    expect(g('Приседания со штангой')).toEqual(['Штанга']);
    expect(g('Подъём гантелей на бицепс')).toEqual(['2 гантели']);
    expect(g('Приседания с гантелью')).toEqual(['Гантель']);
    expect(g('Махи гирей')).toEqual(['Гиря']);
    expect(g('Подтягивания')).toEqual(['Турник']);
    expect(g('Прыжки на скакалке')).toEqual(['Скакалка']);
  });
  it('скамья: жим лёжа и всё «на скамье»', () => {
    expect(g('Жим лёжа')).toEqual(['Штанга', 'Скамья']);
    expect(g('Жим гантелей лёжа')).toEqual(['2 гантели', 'Скамья']);
    expect(g('Жим на наклонной скамье')).toEqual(['Скамья']);
  });
  it('тренажёр и коврик', () => {
    expect(g('Тяга верхнего блока')).toEqual(['Тренажёр']);
    expect(g('Жим ногами')).toEqual(['Тренажёр']);
    expect(g('Планка')).toEqual(['Коврик']);
    expect(g('Скручивания')).toEqual(['Коврик']);
    expect(g('Ножницы лёжа')).toEqual(['Коврик']);
  });
  it('не угадали: без снаряда', () => {
    expect(g('Отжимания')).toEqual([]);
    expect(g('Вращения головой')).toEqual([]);
  });
});

describe('migrateEquipment', () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(':memory:');
  });
  const add = (name: string, kind: ExerciseKind = 'weight') => {
    const r = createExercise(db, { name, group: 'legs', kind, muscles: [], aliases: [] });
    if (!r.ok) throw new Error('exercise');
    return r.entry.id;
  };
  const gear = (id: string) => libraryOf(db).find((e) => e.id === id)!.equipment;

  it('заполняет только пустой инвентарь; заданный не трогает', () => {
    const a = add('Приседания со штангой');
    const b = add('Румынская тяга со штангой');
    updateExercise(db, b, { equipment: ['Гиря'] });
    const report = migrateEquipment(db);
    expect(gear(a)).toEqual(['Штанга']);
    expect(gear(b)).toEqual(['Гиря']);
    expect(report).toEqual({ updated: 1, unknown: [] });
  });

  it('повторный запуск ничего не меняет; нераспознанные попадают в отчёт', () => {
    add('Приседания со штангой');
    add('Странное упражнение');
    expect(migrateEquipment(db)).toEqual({ updated: 1, unknown: ['Странное упражнение'] });
    expect(migrateEquipment(db)).toEqual({ updated: 0, unknown: ['Странное упражнение'] });
  });
});

describe('стартовый набор', () => {
  it('инвентарь берётся по slug, даже если название его не называет', () => {
    const db = openDb(':memory:');
    db.prepare("INSERT INTO exercises (slug, name, kind, group_id, created_at) VALUES ('dumbbell-lunge', 'Выпады', 'weight', 'legs', 'x'), ('x', 'Румынская тяга', 'weight', 'legs', 'x')").run();
    migrateEquipment(db);
    expect(libraryOf(db).map((e) => e.equipment)).toEqual([['2 гантели'], ['Штанга']]);
  });
});
