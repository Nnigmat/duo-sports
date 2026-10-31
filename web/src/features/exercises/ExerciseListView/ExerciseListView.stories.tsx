import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { GroupFilter } from '../library';
import { exerciseLibrary } from '../mock';
import { ExerciseListView } from './ExerciseListView';

const meta = {
  title: 'Features/Exercises/ExerciseListView',
  component: ExerciseListView,
  args: { exercises: exerciseLibrary, query: '', group: 'all', onQueryChange: fn(), onGroupChange: fn(), onOpen: fn(), onCreate: fn() },
  parameters: { docs: { description: { component: 'Артборд «Мобильная · Упражнения»: поиск, группы мышц, разделы со строками.' } } },
} satisfies Meta<typeof ExerciseListView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Упражнения');
    await userEvent.click(c.getByRole('button', { name: /Приседания со штангой/ }));
    await expect(args.onOpen).toHaveBeenCalledWith('squat');
    await userEvent.click(c.getByRole('button', { name: 'Своё упражнение' }));
    await expect(args.onCreate).toHaveBeenCalled();
  },
};
export const Desktop: Story = {
  args: { layout: 'desktop' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
};
export const FilteredByGroup: Story = { args: { group: 'back' } };
export const Searching: Story = { args: { query: 'гантел' } };
export const NothingFound: Story = {
  args: { query: 'йога' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Ничего не нашлось')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Сбросить фильтры' }));
    await expect(args.onQueryChange).toHaveBeenCalledWith('');
    await expect(args.onGroupChange).toHaveBeenCalledWith('all');
  },
};

function Live() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  return <ExerciseListView exercises={exerciseLibrary} query={query} onQueryChange={setQuery} group={group} onGroupChange={setGroup} onOpen={() => {}} onCreate={() => {}} />;
}
export const Interactive: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /^Спина/ }));
    await expect(c.queryByText('Приседания со штангой')).toBeNull();
    await expect(c.getByText('Подтягивания')).toBeVisible();
    await userEvent.type(c.getByRole('searchbox'), 'присед');
    await expect(c.getByText('Ничего не нашлось')).toBeVisible();
  },
};
