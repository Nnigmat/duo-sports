/** Чистая логика входа и смены пароля: проверки полей, правила и надёжность пароля. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTER = /[A-Za-zА-Яа-яЁё]/;
const UPPER_OR_SYMBOL = /[A-ZА-ЯЁ]|[^A-Za-zА-Яа-яЁё0-9]/;

export const isEmail = (value: string) => EMAIL.test(value);

export type LoginErrors = { email?: string; password?: string };

export function loginErrors(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!email) errors.email = 'Введите email';
  else if (!isEmail(email)) errors.email = 'Проверьте email: нужен адрес вида name@mail.ru';
  if (!password) errors.password = 'Введите пароль';
  return errors;
}

export type PasswordRuleId = 'length' | 'mix' | 'differs';

export const passwordRuleTexts: Record<PasswordRuleId, string> = {
  length: 'Не короче 8 символов',
  mix: 'Есть буквы и цифры',
  differs: 'Отличается от текущего пароля',
};

/** Какие правила выполнены для нового пароля. */
export function passwordRules(next: string, current: string): Record<PasswordRuleId, boolean> {
  return {
    length: next.length >= 8,
    mix: LETTER.test(next) && /\d/.test(next),
    differs: next.length > 0 && next !== current,
  };
}

export const passwordOk = (next: string, current: string) =>
  Object.values(passwordRules(next, current)).every(Boolean);

export type Strength = 0 | 1 | 2 | 3 | 4;

/** 0 — пароль пуст, иначе 1–4: длина, буквы и цифры, заглавная или символ, 12 и больше символов. */
export function passwordStrength(next: string): Strength {
  if (!next) return 0;
  const rules = passwordRules(next, '');
  const score =
    (rules.length ? 1 : 0) +
    (rules.mix ? 1 : 0) +
    (UPPER_OR_SYMBOL.test(next) ? 1 : 0) +
    (next.length >= 12 ? 1 : 0);
  return Math.max(1, score) as Strength;
}

export const strengthLabels = ['', 'слабый', 'средний', 'хороший', 'надёжный'] as const;

export type ChangePasswordErrors = { current?: string; next?: string; confirm?: string };

export function changePasswordErrors(current: string, next: string, confirm: string): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};
  if (!current) errors.current = 'Введите текущий пароль';
  if (!next) errors.next = 'Придумайте новый пароль';
  else if (!passwordOk(next, current)) errors.next = 'Пароль не соответствует требованиям';
  if (!confirm) errors.confirm = 'Повторите новый пароль';
  else if (confirm !== next) errors.confirm = 'Пароли не совпадают';
  return errors;
}
