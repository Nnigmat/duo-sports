import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PreviewSummary } from './PreviewSummary';

const meta = {
  title: 'Features/Import/PreviewSummary',
  component: PreviewSummary,
  args: { workouts: 26, weeks: 13, days: 'Вт · Чт', period: '27 окт — 21 янв', found: 2, newCount: 31 },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 2 Проверка»: плитки итога над списками.' } } },
} satisfies Meta<typeof PreviewSummary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('тренировок · 13 недель')).toBeVisible();
    await expect(c.getByText('упражнения нашлись в библиотеке')).toBeVisible();
    await expect(c.getByRole('link', { name: /31 новое упражнение — решите ниже/ })).toHaveAttribute('href', '#new-ex');
  },
};
export const Single: Story = { args: { workouts: 1, weeks: 1, found: 1, newCount: 1 } };
