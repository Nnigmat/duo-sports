import { describe, expect, it } from 'vitest';
import { errorText } from './api';

describe('errorText', () => {
  it('понятные тексты по коду ответа', () => {
    expect(errorText(401)).toBe('Сессия закончилась: войдите заново');
    expect(errorText(410)).toBe('Отменить импорт можно было в течение 24 часов');
    expect(errorText(409)).toMatch(/обновите страницу/);
    expect(errorText(404)).toBe('Импорт не найден');
  });
  it('400 с пояснением сервера и без', () => {
    expect(errorText(400, 'workouts: список от 1 до 500')).toBe('Сервер не принял данные: workouts: список от 1 до 500');
    expect(errorText(400)).toBe('Сервер не принял данные');
  });
  it('остальное — код ответа', () => {
    expect(errorText(500)).toBe('Сервер ответил 500');
  });
});
