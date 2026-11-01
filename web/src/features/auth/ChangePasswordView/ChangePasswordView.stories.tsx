import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChangePasswordView } from './ChangePasswordView';

const meta = {
  title: 'Features/Auth/ChangePasswordView',
  component: ChangePasswordView,
  args: {
    lastChanged: '12 августа 2026',
    email: 'nikita@example.com',
    onSubmit: fn(),
    onLogout: fn(),
  },
  parameters: {
    docs: { description: { component: 'Артборд «Десктоп · Смена пароля»: карточка смены пароля с панелью требований и карточка выхода. Навигация и вкладки настроек — отдельно, в оболочке приложения.' } },
  },
} satisfies Meta<typeof ChangePasswordView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Смена пароля' })).toBeVisible();
    await expect(c.getByText('Последнее изменение — 12 августа 2026')).toBeVisible();
  },
};
export const Desktop: Story = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    // Пустая отправка: три ошибки, правила помечены, onSubmit не вызван
    await userEvent.click(c.getByRole('button', { name: 'Сохранить пароль' }));
    await expect(c.getByLabelText('Текущий пароль')).toHaveAccessibleDescription('Введите текущий пароль');
    await expect(c.getByLabelText('Новый пароль')).toHaveAccessibleDescription('Придумайте новый пароль');
    await expect(c.getByLabelText('Повторите новый пароль')).toHaveAccessibleDescription('Повторите новый пароль');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
export const Typing: Story = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Текущий пароль'), 'trenirovka7');
    await userEvent.type(c.getByLabelText('Новый пароль'), 'Prisyad-80kg');
    await expect(c.getByText('надёжный')).toBeVisible();
    await userEvent.type(c.getByLabelText('Повторите новый пароль'), 'Prisyad-80kg');
    await expect(c.getByText('Пароли совпадают')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Сохранить пароль' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ current: 'trenirovka7', next: 'Prisyad-80kg', logoutOthers: true });
  },
};
export const ShowPasswords: Story = {
  args: { initial: { current: 'trenirovka7', next: 'Prisyad-80kg', confirm: 'Prisyad-80kg' } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText('Новый пароль')).toHaveAttribute('type', 'password');
    await userEvent.click(c.getByRole('checkbox', { name: 'Показать пароли' }));
    await expect(c.getByLabelText('Новый пароль')).toHaveAttribute('type', 'text');
    await expect(c.getByLabelText('Текущий пароль')).toHaveAttribute('type', 'text');
  },
};
export const Mismatch: Story = {
  args: { initial: { current: 'trenirovka7', next: 'Prisyad-80kg', confirm: 'Prisyad-80k' } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Сохранить пароль' }));
    await expect(c.getByLabelText('Повторите новый пароль')).toHaveAccessibleDescription('Пароли не совпадают');
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
export const WrongCurrent: Story = {
  args: { status: 'wrongCurrent', initial: { current: 'trenirovka7', next: 'Prisyad-80kg', confirm: 'Prisyad-80kg' } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Текущий пароль')).toHaveAccessibleDescription('Неверный текущий пароль');
  },
};
export const Saved: Story = {
  args: { status: 'saved' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Последнее изменение — только что')).toBeVisible();
    await expect(c.getByRole('status')).toHaveTextContent('Мы отключили остальные устройства');
    await userEvent.click(c.getByRole('button', { name: 'Выйти и войти заново' }));
    await expect(args.onLogout).toHaveBeenCalled();
  },
};

function Live() {
  const [status, setStatus] = useState<'wrongCurrent' | 'saved' | undefined>();
  return (
    <ChangePasswordView
      lastChanged="12 августа 2026"
      email="nikita@example.com"
      status={status}
      // «Сервер»: пароль trenirovka7 верный, любой другой — нет
      onSubmit={({ current }) => setStatus(current === 'trenirovka7' ? 'saved' : 'wrongCurrent')}
      onLogout={fn()}
    />
  );
}
export const Interactive: Story = {
  render: () => <Live />,
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Текущий пароль'), 'wrong1234');
    await userEvent.type(c.getByLabelText('Новый пароль'), 'Prisyad-80kg');
    await userEvent.type(c.getByLabelText('Повторите новый пароль'), 'Prisyad-80kg');
    await userEvent.click(c.getByRole('button', { name: 'Сохранить пароль' }));
    await expect(c.getByLabelText('Текущий пароль')).toHaveAccessibleDescription('Неверный текущий пароль');
    await userEvent.clear(c.getByLabelText('Текущий пароль'));
    await userEvent.type(c.getByLabelText('Текущий пароль'), 'trenirovka7');
    await userEvent.click(c.getByRole('button', { name: 'Сохранить пароль' }));
    await expect(c.getByRole('status')).toHaveTextContent('Пароль изменён');
    await expect(c.getByLabelText('Новый пароль')).toHaveValue('');
  },
};
