import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { achievementsFixture } from '../../../data/fixtures';
import type { CategoryFilter } from '../achievements';
import { AchievementsView } from './AchievementsView';

const meta = {
  title: 'Features/Achievements/AchievementsView',
  component: AchievementsView,
  args: { data: achievementsFixture, filter: 'all', onFilterChange: fn(), onBack: fn() },
  parameters: { docs: { description: { component: 'Артборды «Мобильный · Достижения» и «Десктоп · Достижения».' } } },
} satisfies Meta<typeof AchievementsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Достижения' })).toBeVisible();
    await expect(c.getAllByRole('heading', { level: 2 })).toHaveLength(5);
    await expect(c.getAllByRole('article')).toHaveLength(12);
    await expect(c.getByRole('button', { name: /^Все/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: /Вдвоём/ }));
    await expect(args.onFilterChange).toHaveBeenCalledWith('duo');
    await userEvent.click(c.getByRole('button', { name: 'Назад к прогрессу' }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};
export const FilteredByCategory: Story = {
  args: { filter: 'strength' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    await expect(c.getAllByRole('article')).toHaveLength(4);
  },
};
export const Desktop: Story = {
  args: { layout: 'desktop', onBack: undefined },
  globals: { viewport: { value: 'desktop', isRotated: false } },
};

function Live() {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  return <AchievementsView data={achievementsFixture} filter={filter} onFilterChange={setFilter} />;
}
export const Interactive: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Особые/ }));
    await expect(c.getAllByRole('article')).toHaveLength(2);
    await expect(c.getByRole('button', { name: /Особые/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: /^Все/ }));
    await expect(c.getAllByRole('article')).toHaveLength(12);
  },
};
