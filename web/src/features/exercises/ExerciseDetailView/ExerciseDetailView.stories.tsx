import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { fresh, plank, pullup, squat } from '../mock';
import { ExerciseDetailView } from './ExerciseDetailView';

const meta = {
  title: 'Features/Exercises/ExerciseDetailView',
  component: ExerciseDetailView,
  args: { exercise: squat, onBack: fn(), onEdit: fn(), onOpenHistory: fn(), onAddVideo: fn() },
  parameters: { docs: { description: { component: 'Артборды «Карточка»: вес × повторы, собственный вес, на время, без истории.' } } },
} satisfies Meta<typeof ExerciseDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Weight: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Приседания со штангой');
    await expect(c.getByRole('img', { name: /Рабочий вес за 8 тренировок/ })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Редактировать' }));
    await expect(args.onEdit).toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Все тренировки' }));
    await expect(args.onOpenHistory).toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Упражнения' }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};
export const Bodyweight: Story = { args: { exercise: pullup } };
export const Time: Story = { args: { exercise: plank } };
export const NeverPerformed: Story = {
  args: { exercise: fresh },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Ещё не выполнялось')).toBeVisible();
    await expect(c.getByRole('button', { name: 'Добавить видео' })).toBeVisible();
    await expect(c.queryByRole('region', { name: 'График' })).toBeNull();
  },
};

export const WithNotes: Story = {
  args: { exercise: { ...squat, notes: 'Встаньте прямо\nОпуститесь до параллели\nВстаньте'} },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const region = c.getByRole('region', { name: 'Как выполнять' });
    await expect(within(region).getAllByRole('listitem')).toHaveLength(3);
  },
};
export const ReadOnly: Story = {
  args: { onEdit: undefined },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole('button', { name: 'Редактировать' })).toBeNull();
    await expect(c.getByRole('heading', { level: 1 })).toBeVisible();
  },
};
