import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { libraryFixture } from '../fixtures';
import { ExerciseReference } from './ExerciseReference';

const meta = {
  title: 'Features/Import/ExerciseReference',
  component: ExerciseReference,
  args: { exercises: libraryFixture, onCopy: fn() },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 1 Источник»: справочник упражнений библиотеки с поиском и фильтром по группам.' } } },
} satisfies Meta<typeof ExerciseReference>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Упражнения в библиотеке' })).toBeVisible();
    await expect(c.getByRole('status')).toHaveTextContent(`${libraryFixture.length}`);
    await expect(c.getByText('Как задать нагрузку')).toBeVisible();
  },
};

export const Search: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('searchbox', { name: 'Поиск упражнения' }), 'нет-такого-упражнения');
    await expect(c.getByText(/Ничего не найдено/)).toBeVisible();
    await expect(c.queryByRole('status')).toHaveTextContent('Показано 0 из');
  },
};

export const GroupFilter: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const groups = within(c.getByRole('group', { name: 'Группа мышц' }));
    await userEvent.click(groups.getAllByRole('button')[1]);
    await expect(groups.getAllByRole('button')[1]).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByRole('status')).toHaveTextContent('Показано');
  },
};

export const Copy: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Копировать exercises.yaml' }));
    await expect(args.onCopy).toHaveBeenCalledWith(expect.stringMatching(/^exercises:\n/));
    await expect(c.getByRole('button', { name: 'Скопировано' })).toBeVisible();
  },
};
