import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { addedList } from '../done';
import { newExercisesFixture } from '../fixtures';
import { EMPTY_CHOICES, useAllSimilar } from '../preview';
import { AddedExercises } from './AddedExercises';

const meta = {
  title: 'Features/Import/AddedExercises',
  component: AddedExercises,
  args: { items: addedList(newExercisesFixture, EMPTY_CHOICES), created: 31, href: '/exercises' },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 4 Готово»: что попало в библиотеку. Видно семь строк, остальные — по ссылке.' } } },
} satisfies Meta<typeof AddedExercises>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Новые упражнения · 31' })).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(7);
    await expect(c.getByRole('link', { name: 'Все 31 во вкладке «Упражнения»' })).toHaveAttribute('href', '/exercises');
  },
};

export const WithLibrary: Story = {
  args: { items: addedList(newExercisesFixture, useAllSimilar(EMPTY_CHOICES, newExercisesFixture)).slice(5, 12), created: 25 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText('Из библиотеки').length).toBeGreaterThan(0);
  },
};

export const Empty: Story = {
  args: { items: [], created: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading')).toBeNull();
  },
};
