import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { buildNotices } from '../done';
import { newExercisesFixture, planSourceFixture } from '../fixtures';
import { buildPlan, DEFAULT_OPTIONS } from '../importPlan';
import { EMPTY_CHOICES } from '../preview';
import { ImportNotices } from './ImportNotices';

const meta = {
  title: 'Features/Import/ImportNotices',
  component: ImportNotices,
  args: { notices: buildNotices(buildPlan(planSourceFixture, DEFAULT_OPTIONS), newExercisesFixture, EMPTY_CHOICES) },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 4 Готово»: замечания после импорта — пропущенные дни, замены, упражнения без видео.' } } },
} satisfies Meta<typeof ImportNotices>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Обратите внимание' })).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(3);
    await expect(c.getByText('2 тренировки заменены')).toBeVisible();
  },
};

export const Nothing: Story = {
  args: { notices: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading')).toBeNull();
  },
};
