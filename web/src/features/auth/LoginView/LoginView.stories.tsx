import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { LoginView } from './LoginView';

const meta = {
  title: 'Features/Auth/LoginView',
  component: LoginView,
  args: { onSubmit: fn(), forgotHref: '#forgot' },
  parameters: {
    bleed: true,
    docs: { description: { component: 'Артборды «Десктоп · Вход» и «Мобильный · Вход». Состояния: форма, неверный пароль, вход закрыт на 15 минут. Аккаунты создаёт админ, регистрации на экране нет.' } },
  },
} satisfies Meta<typeof LoginView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Вход' })).toBeVisible();
    // Пустая отправка: ошибки у обоих полей, onSubmit не вызван
    await userEvent.click(c.getByRole('button', { name: 'Войти' }));
    await expect(c.getByLabelText('Email')).toHaveAccessibleDescription('Введите email');
    await expect(c.getByLabelText('Пароль')).toHaveAccessibleDescription('Введите пароль');
    await expect(args.onSubmit).not.toHaveBeenCalled();
    // Заполняем и входим
    await userEvent.type(c.getByLabelText('Email'), 'nikita@example.com');
    await userEvent.type(c.getByLabelText('Пароль'), 'trenirovka7');
    await userEvent.click(c.getByRole('button', { name: 'Войти' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ email: 'nikita@example.com', password: 'trenirovka7', remember: true });
  },
};
export const Desktop: Story = {
  args: { layout: 'desktop' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Каждый подход на счету' })).toBeVisible();
    await expect(c.queryByLabelText('Запомнить меня')).toBeNull();
    await expect(c.getByRole('link', { name: 'Забыли пароль?' })).toBeVisible();
  },
};
export const InvalidEmail: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Email'), 'nikita@');
    await userEvent.type(c.getByLabelText('Пароль'), 'x');
    await userEvent.click(c.getByRole('button', { name: 'Войти' }));
    await expect(c.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(c.getByLabelText('Email')).toHaveAccessibleDescription(/Проверьте email/);
  },
};
export const WrongPassword: Story = {
  args: { status: 'wrongPassword', initial: { email: 'nikita@example.com', password: 'trenirovka7' } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('alert')).toHaveTextContent('Неверный email или пароль');
    // Начали править пароль — сообщение уходит
    await userEvent.type(c.getByLabelText('Пароль'), '1');
    await expect(c.queryByRole('alert')).toBeNull();
  },
};
export const WrongPasswordDesktop: Story = {
  args: { layout: 'desktop', status: 'wrongPassword', initial: { email: 'nikita@example.com', password: 'trenirovka7' } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
};
export const Locked: Story = {
  args: { status: 'locked', initial: { email: 'nikita@example.com', password: 'trenirovka7' } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Попробуйте снова через 15 минут/)).toBeVisible();
    await expect(c.getByRole('button', { name: 'Войти' })).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
export const LockedDesktop: Story = {
  args: { layout: 'desktop', status: 'locked', initial: { email: 'nikita@example.com', password: 'trenirovka7' } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
};
