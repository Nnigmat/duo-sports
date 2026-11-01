import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT } from '../../../ui/storyKit';
import { PasswordRules } from './PasswordRules';

const meta = {
  title: 'Features/Auth/PasswordRules',
  component: PasswordRules,
  args: { next: '', current: 'trenirovka7', submitted: false },
  parameters: { docs: { description: { component: `Артборд «Десктоп · Смена пароля» (панель «Требования к паролю»). Выполнено — галочка, не выполнено после отправки — крестик, ещё не проверяли — пустой круг; у каждого скрытая подпись. ${ARTIFACT}` } } },
} satisfies Meta<typeof PasswordRules>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(/— не выполнено/)).toHaveLength(3);
  },
};
export const PartlyMet: Story = {
  args: { next: 'Prisyad80' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Не короче 8 символов').textContent).toContain('— выполнено');
  },
};
export const AllMet: Story = {
  args: { next: 'Prisyad-80kg' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/— не выполнено/)).toBeNull();
  },
};
export const FailedAfterSubmit: Story = {
  args: { next: 'abc', submitted: true },
};
