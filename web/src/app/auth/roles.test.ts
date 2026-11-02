import { describe, expect, it } from 'vitest';
import { canEnterTrainer, homePath } from './roles';

describe('roles', () => {
  it('в кабинет тренера пускают тренера и админа', () => {
    expect(canEnterTrainer('trainer')).toBe(true);
    expect(canEnterTrainer('admin')).toBe(true);
    expect(canEnterTrainer('athlete')).toBe(false);
  });
  it('домашний экран: у спортсмена «Сегодня», у тренера и админа список учеников', () => {
    expect(homePath('athlete')).toBe('/');
    expect(homePath('trainer')).toBe('/trainer');
    expect(homePath('admin')).toBe('/trainer');
  });
});
