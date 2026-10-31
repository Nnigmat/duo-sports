import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { TodayHeader } from './TodayHeader';

const meta = {
  title: 'Features/Today/TodayHeader',
  component: TodayHeader,
  args: { dateLabel: 'Суббота, 31 октября', userName: 'Никита', streakWeeks: 3 },
} satisfies Meta<typeof TodayHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Привет, Никита' })).toBeInTheDocument();
    await expect(c.getByText('3 недели')).toBeInTheDocument();
  },
};

export const NoStreak: Story = { args: { streakWeeks: 0 } };

export const LongName: Story = { args: { userName: 'Александра-Виктория' } };
