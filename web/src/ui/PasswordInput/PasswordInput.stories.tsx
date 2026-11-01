import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { PasswordInput } from './PasswordInput';

const meta = {
  title: 'UI/PasswordInput',
  component: PasswordInput,
  args: { label: 'Пароль', autoComplete: 'current-password', defaultValue: 'trenirovka7' },
  argTypes: { label: { control: 'text' }, hint: { control: 'text' }, error: { control: 'text' } },
  parameters: { docs: { description: { component: `Артборды «Десктоп · Вход», «Мобильный · Вход» (поле пароля с глазом внутри). ${ARTIFACT}` } } },
} satisfies Meta<typeof PasswordInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText('Пароль');
    await expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(c.getByRole('button', { name: 'Показать пароль' }));
    await expect(input).toHaveAttribute('type', 'text');
    await expect(c.getByRole('button', { name: 'Скрыть пароль' })).toHaveAttribute('aria-pressed', 'true');
  },
};
export const WithError: Story = {
  args: { error: 'Введите пароль', defaultValue: '' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Пароль')).toHaveAccessibleDescription('Введите пароль');
  },
};
export const WithLabelAside: Story = {
  args: { labelAside: <a href="#forgot">Забыли пароль?</a> },
};
