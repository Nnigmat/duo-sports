import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { todayFixture } from '../../../data/fixtures';
import { AchievementsPreview } from './AchievementsPreview';

const data = todayFixture.insights!.achievements;

const meta = {
  title: 'Features/Today/AchievementsPreview',
  component: AchievementsPreview,
  args: { data, onOpenAll: fn(), onOpenLatest: fn() },
} satisfies Meta<typeof AchievementsPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('13 из 33 уровней')).toBeInTheDocument();
    await expect(c.getAllByRole('progressbar')).toHaveLength(2);
    await userEvent.click(c.getByRole('button', { name: 'Все достижения' }));
    await expect(args.onOpenAll).toHaveBeenCalledTimes(1);
  },
};

export const OneNear: Story = { args: { data: { ...data, near: data.near.slice(0, 1) } } };
