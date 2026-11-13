import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type Db } from './db';
import { createExercise, updateExercise } from './exercises';
import { libraryOf } from './imports';
import { EQUIPMENT_BY_NAME, EQUIPMENT_TABLE, migrateEquipment } from './migrateEquipment';

let db: Db;
beforeEach(() => {
  db = openDb(':memory:');
});
const add = (name: string) => {
  const r = createExercise(db, { name, group: 'legs', kind: 'weight', muscles: [], aliases: [] });
  if (!r.ok) throw new Error('exercise');
  return r.entry.id;
};
const gear = (id: string) => libraryOf(db).find((e) => e.id === id)!.equipment;

describe('таблица инвентаря', () => {
  it('названия не повторяются без учёта регистра и ё', () => {
    expect(EQUIPMENT_BY_NAME.size).toBe(EQUIPMENT_TABLE.length);
  });
});

describe('migrateEquipment', () => {
  it('ставит инвентарь по названию, без учёта регистра и ё/е', () => {
    const a = add('Жим лёжа');
    const b = add('отжимания с касанием предмета');
    const c = add('Отжимания на брусьях');
    expect(migrateEquipment(db)).toEqual({ updated: 3, unlisted: [] });
    expect(gear(a)).toEqual(['Штанга', 'Скамья']);
    expect(gear(b)).toEqual(['Коврик', 'Упоры для отжиманий']);
    expect(gear(c)).toEqual(['Брусья']);
  });

  it('заданный вручную инвентарь не трогает', () => {
    const a = add('Румынская тяга');
    updateExercise(db, a, { equipment: ['Гиря'] });
    expect(migrateEquipment(db)).toEqual({ updated: 0, unlisted: [] });
    expect(gear(a)).toEqual(['Гиря']);
  });

  it('«Выпады» и «Подъёмы на носки» без снаряда: не меняются и в отчёт не попадают', () => {
    const a = add('Выпады');
    add('Подъёмы на носки');
    expect(migrateEquipment(db)).toEqual({ updated: 0, unlisted: [] });
    expect(gear(a)).toEqual([]);
  });

  it('упражнения не из таблицы остаются пустыми и попадают в отчёт; повторный запуск ничего не меняет', () => {
    add('Планка');
    add('Странное упражнение');
    expect(migrateEquipment(db)).toEqual({ updated: 1, unlisted: ['Странное упражнение'] });
    expect(migrateEquipment(db)).toEqual({ updated: 0, unlisted: ['Странное упражнение'] });
  });
});
