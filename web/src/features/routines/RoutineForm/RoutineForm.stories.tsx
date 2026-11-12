import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { pickerExercises, routineDetail } from '../mock';
import { RoutineForm } from './RoutineForm';

const meta = {
  title: 'Features/Routines/RoutineForm',
  component: RoutineForm,
  args: { exercises: pickerExercises, onCancel: fn(), onSubmit: fn() },
} satisfies Meta<typeof RoutineForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  args: { mode: 'create', kind: 'warmup' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('button', { name: 'Создать' })[0]).toBeDisabled();
    await userEvent.type(c.getByLabelText('Название'), 'Плечи');
    await expect(c.getByText('· Добавьте хотя бы одно упражнение')).toBeVisible();
  },
};
export const EditUsed: Story = { args: { mode: 'edit', routine: routineDetail, onDelete: fn() } };
export const EditUnused: Story = { args: { mode: 'edit', routine: { ...routineDetail, usedIn: 0, usedBy: [] }, onDelete: fn() } };

export const Yaml: Story = {
  args: { mode: 'edit', routine: routineDetail, onDelete: fn() },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('tab', { name: 'YAML' }));
    await expect((c.getByLabelText('Разминка в YAML') as HTMLTextAreaElement).value).toContain('title: Ноги, лёгкая');
  },
};
