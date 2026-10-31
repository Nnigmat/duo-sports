import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { achievementsFixture } from '../../../data/fixtures';
import { AchievementsSummary } from './AchievementsSummary';

const meta = {
  title: 'Features/Achievements/AchievementsSummary',
  component: AchievementsSummary,
  args: { categories: achievementsFixture.categories },
} satisfies Meta<typeof AchievementsSummary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('13 из 33')).toBeVisible();
    await expect(c.getByText('Присед · серебро')).toBeVisible();
    await expect(c.getByText(/80 из 82/)).toBeVisible();
    await expect(c.getByRole('progressbar', { name: 'Присед, до серебра' })).toHaveAttribute('aria-valuenow', '98');
    await expect(c.getAllByRole('listitem')).toHaveLength(4);
  },
};
export const Desktop: Story = {
  args: { layout: 'desktop' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
};
export const NothingYet: Story = {
  args: {
    categories: achievementsFixture.categories.map((c) => ({
      ...c,
      items: c.items.map((a) => ({ ...a, tier: 0 as const, earnedDates: [], current: 0 })),
    })),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('0 из 33')).toBeVisible();
  },
};
export const AllEarned: Story = {
  args: {
    categories: achievementsFixture.categories.map((c) => ({
      ...c,
      items: c.items.map((a) => (a.secret ? a : { ...a, tier: 3 as const, earnedDates: ['1 янв', '2 янв', '3 янв'] })),
    })),
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('33 из 33')).toBeVisible();
    await expect(c.queryByRole('progressbar')).toBeNull();
  },
};
