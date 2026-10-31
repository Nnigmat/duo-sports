import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { HistorySort } from '../library';
import { fresh, plank, pullup, squat } from '../mock';
import { ExerciseHistoryView } from './ExerciseHistoryView';

const meta = {
  title: 'Features/Exercises/ExerciseHistoryView',
  component: ExerciseHistoryView,
  args: { exercise: squat, sort: 'new', onSortChange: fn(), onBack: fn(), onShowMore: fn() },
  parameters: { bleed: true, docs: { description: { component: 'Артборд «Мобильная · Все тренировки».' } } },
} satisfies Meta<typeof ExerciseHistoryView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Weight: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Все тренировки');
    await userEvent.click(c.getByRole('button', { name: 'Показать ещё 6' }));
    await expect(args.onShowMore).toHaveBeenCalled();
  },
};
export const Bodyweight: Story = { args: { exercise: pullup } };
export const Time: Story = { args: { exercise: plank } };
export const Empty: Story = { args: { exercise: fresh } };

function Live() {
  const [sort, setSort] = useState<HistorySort>('new');
  return <ExerciseHistoryView exercise={squat} sort={sort} onSortChange={setSort} onBack={() => {}} />;
}
export const Sorting: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const dates = () => c.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    await expect(dates()[0]).toBe('28 окт');
    await userEvent.click(c.getByRole('tab', { name: 'Сначала старые' }));
    await expect(dates()[0]).toBe('7 сен');
  },
};
