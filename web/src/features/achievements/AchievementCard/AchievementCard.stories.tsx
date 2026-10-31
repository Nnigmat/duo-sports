import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { achievementsFixture } from '../../../data/fixtures';
import { Row, Stack } from '../../../ui/storyKit';
import { AchievementCard } from './AchievementCard';

const all = achievementsFixture.categories.flatMap((c) => c.items);
const byId = (id: string) => all.find((a) => a.id === id)!;

const meta = {
  title: 'Features/Achievements/AchievementCard',
  component: AchievementCard,
  args: { achievement: byId('no-skips') },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Карточка достижения из макета «Мобильный · Достижения».' } } },
} satisfies Meta<typeof AchievementCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bronze: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 3, name: 'Без пропусков' })).toBeVisible();
    await expect(c.getByText('Бронза · начальный · 26 окт')).toBeVisible();
    await expect(c.getByText('Цель: Серебро · 8 нед')).toBeVisible();
    await expect(c.getByRole('progressbar', { name: 'Без пропусков, до серебра' })).toHaveAttribute('aria-valuenow', '63');
  },
};
export const Silver: Story = { args: { achievement: byId('heavy-day') } };
export const Maxed: Story = {
  args: { achievement: { ...byId('heavy-day'), tier: 3, earnedDates: ['9 авг', '12 окт', '30 окт'] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Все уровни получены')).toBeVisible();
    await expect(c.queryByRole('progressbar')).toBeNull();
  },
};
export const NotEarned: Story = {
  args: { achievement: { ...byId('on-video'), tier: 0, earnedDates: [], current: 0 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Нет · уровень отсутствует')).toBeVisible();
  },
};
export const Secret: Story = {
  args: { achievement: byId('secret') },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Условие скрыто')).toBeVisible();
    await expect(c.queryByRole('progressbar')).toBeNull();
  },
};
export const Desktop: Story = {
  args: { layout: 'desktop' },
  decorators: [(Story) => <div style={{ maxWidth: 300 }}><Story /></div>],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('До серебра')).toBeVisible();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      {(['mobile', 'desktop'] as const).map((layout) => (
        <Row key={layout} label={layout}>
          {['no-skips', 'heavy-day', 'secret'].map((id) => (
            <div key={id} style={{ width: layout === 'mobile' ? 358 : 300 }}>
              <AchievementCard achievement={byId(id)} layout={layout} />
            </div>
          ))}
        </Row>
      ))}
    </Stack>
  ),
};
