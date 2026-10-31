import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { todayFixture } from '../../../data/fixtures';
import { ActivityCard } from './ActivityCard';

const meta = {
  title: 'Features/Today/ActivityCard',
  component: ActivityCard,
  args: { activity: todayFixture.insights!.activity },
  decorators: [(Story) => <div style={{ maxWidth: 420 }}><Story /></div>],
} satisfies Meta<typeof ActivityCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Последние 12 недель · 31 тренировка')).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { activity: { levels: Array(84).fill(0), workouts: 0 } } };
