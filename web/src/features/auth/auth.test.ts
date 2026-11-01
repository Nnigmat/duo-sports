import { describe, expect, it } from 'vitest';
import {
  changePasswordErrors,
  isEmail,
  loginErrors,
  passwordOk,
  passwordRules,
  passwordStrength,
} from './auth';

describe('loginErrors', () => {
  it('пустая форма — оба поля с ошибкой', () => {
    expect(loginErrors('', '')).toEqual({ email: 'Введите email', password: 'Введите пароль' });
  });
  it('email без домена не проходит', () => {
    expect(loginErrors('nikita@', 'x').email).toBe('Проверьте email: нужен адрес вида name@mail.ru');
  });
  it('верные данные — без ошибок', () => {
    expect(loginErrors('nikita@example.com', 'trenirovka7')).toEqual({});
  });
});

describe('isEmail', () => {
  it('пробелы внутри запрещены', () => {
    expect(isEmail('a b@mail.ru')).toBe(false);
    expect(isEmail('a@mail.ru')).toBe(true);
  });
});

describe('passwordRules', () => {
  it('короткий пароль без цифр', () => {
    expect(passwordRules('abc', 'old')).toEqual({ length: false, mix: false, differs: true });
  });
  it('кириллица считается буквами', () => {
    expect(passwordRules('Присяд80', '').mix).toBe(true);
  });
  it('совпадает с текущим — правило «отличается» не выполнено', () => {
    expect(passwordRules('trenirovka7', 'trenirovka7').differs).toBe(false);
  });
  it('пустой пароль не «отличается»', () => {
    expect(passwordRules('', 'old').differs).toBe(false);
  });
});

describe('passwordOk', () => {
  it('все три правила', () => {
    expect(passwordOk('Prisyad-80kg', 'trenirovka7')).toBe(true);
    expect(passwordOk('short1', 'trenirovka7')).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('пусто — 0', () => expect(passwordStrength('')).toBe(0));
  it('«abc» — слабый, не ниже 1', () => expect(passwordStrength('abc')).toBe(1));
  it('8 символов, буквы и цифры — 2', () => expect(passwordStrength('trenir12')).toBe(2));
  it('с заглавной — 3', () => expect(passwordStrength('Trenirov7')).toBe(3));
  it('длинный со всем — 4', () => expect(passwordStrength('Prisyad-80kg')).toBe(4));
});

describe('changePasswordErrors', () => {
  it('всё пусто', () => {
    expect(changePasswordErrors('', '', '')).toEqual({
      current: 'Введите текущий пароль',
      next: 'Придумайте новый пароль',
      confirm: 'Повторите новый пароль',
    });
  });
  it('новый не проходит правила, повтор не совпадает', () => {
    expect(changePasswordErrors('trenirovka7', 'short', 'other')).toEqual({
      next: 'Пароль не соответствует требованиям',
      confirm: 'Пароли не совпадают',
    });
  });
  it('верные данные — без ошибок', () => {
    expect(changePasswordErrors('trenirovka7', 'Prisyad-80kg', 'Prisyad-80kg')).toEqual({});
  });
});
