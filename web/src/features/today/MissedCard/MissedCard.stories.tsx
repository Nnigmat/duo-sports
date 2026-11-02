import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MissedCard } from './MissedCard';

const items = [
  { iso: '2026-10-30', label: 'Пятница, 30 октября', title: 'Грудь, кор, спина' },
  { iso: '2026-10-27', label: 'Вторник, 27 октября', title: 'Трицепс, пресс, ноги' },
];

const meta = {
  title: 'Features/Today/MissedCard',
  component: MissedCard,
  args: { items, onMove: fn() },
  parameters: { docs: { description: { component: 'Пропущенные тренировки прошлых недель. Без пропусков блок не показывается.' } } },
} satisfies Meta<typeof MissedCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Пропущено' })).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: /Грудь, кор, спина/ }));
    await expect(args.onMove).toHaveBeenCalledWith('2026-10-30');
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading', { name: 'Пропущено' })).toBeNull();
  },
};
