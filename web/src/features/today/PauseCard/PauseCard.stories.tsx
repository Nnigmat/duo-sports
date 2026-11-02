import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PauseCard } from './PauseCard';

const meta = {
  title: 'Features/Today/PauseCard',
  component: PauseCard,
  args: { pause: { from: '2026-11-02', to: '2026-11-08', label: 'до 8 ноября' }, onResume: fn() },
  parameters: { docs: { description: { component: 'Плашка «План на паузе» на экране «Сегодня».' } } },
} satisfies Meta<typeof PauseCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'План на паузе' })).toBeInTheDocument();
    await expect(c.getByText(/До 8 ноября/)).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: 'Возобновить' }));
    await expect(args.onResume).toHaveBeenCalled();
  },
};
