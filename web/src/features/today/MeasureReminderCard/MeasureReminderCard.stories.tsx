import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MeasureReminderCard } from './MeasureReminderCard';

const meta = {
  title: 'Features/Today/MeasureReminderCard',
  component: MeasureReminderCard,
  args: { daysSince: 15, onMeasure: fn() },
  parameters: { docs: { description: { component: 'Напоминание о замерах: с последнего прошло две недели и больше или замеров ещё не было.' } } },
} satisfies Meta<typeof MeasureReminderCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overdue: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Прошло 15 дней')).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: 'Замеры' }));
    await expect(args.onMeasure).toHaveBeenCalledTimes(1);
  },
};

export const Never: Story = {
  args: { daysSince: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Замеров ещё не было')).toBeInTheDocument();
  },
};

export const TwentyOneDays: Story = {
  args: { daysSince: 21 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Прошло 21 день')).toBeInTheDocument();
  },
};
