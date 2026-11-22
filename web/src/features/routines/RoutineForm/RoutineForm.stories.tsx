import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
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

const withDemo = [{ ...pickerExercises[0]!, demo: { female: '../../web/assets/characters/idle-girl.mp4' } }, ...pickerExercises.slice(1)];

export const PickerThumbs: Story = {
  args: { mode: 'create', kind: 'warmup', exercises: withDemo },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Добавить из библиотеки' }));
    const body = within(document.body);
    const sheet = within(await body.findByRole('dialog', { name: 'Добавить из библиотеки' }));
    await expect(sheet.getAllByRole('button', { name: /^Видео техники:/ })).toHaveLength(3);
    await userEvent.click(sheet.getByRole('button', { name: /^Видео техники: Планка/ }));
    await body.findByRole('dialog', { name: 'Планка' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog', { name: 'Планка' })).toBeNull());
    await expect(c.queryByText('Планка')).toBeNull();
  },
};

export const QuickCreate: Story = {
  args: { mode: 'create', kind: 'warmup', onQuickCreate: fn(async (name: string, kind: 'reps' | 'weight' | 'time') => ({ id: 'new-1', name, kind })) },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Добавить из библиотеки' }));
    const body = within(document.body);
    await userEvent.type(await body.findByLabelText('Поиск по названию'), 'Круги руками');
    const sheet = within(body.getByRole('dialog', { name: 'Добавить из библиотеки' }));
    await expect(sheet.getByLabelText('Название')).toHaveValue('Круги руками');
    await userEvent.click(sheet.getByRole('button', { name: 'Добавить' }));
    await expect(args.onQuickCreate).toHaveBeenCalledWith('Круги руками', 'reps');
    await waitFor(() => expect(body.queryByRole('dialog', { name: 'Добавить из библиотеки' })).toBeNull());
    await expect(c.getByText('Круги руками')).toBeVisible();
  },
};

export const QuickCreateFails: Story = {
  args: { mode: 'create', kind: 'warmup', onQuickCreate: fn(async () => Promise.reject(new Error('Упражнение с таким названием уже есть'))) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Добавить из библиотеки' }));
    const body = within(document.body);
    await userEvent.type(await body.findByLabelText('Поиск по названию'), 'Круги руками');
    await userEvent.click(body.getByRole('button', { name: 'Добавить' }));
    await expect(await body.findByText('Упражнение с таким названием уже есть')).toBeVisible();
    await expect(body.getByRole('dialog', { name: 'Добавить из библиотеки' })).toBeVisible();
  },
};

export const NoQuickCreate: Story = {
  args: { mode: 'create', kind: 'warmup' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Добавить из библиотеки' }));
    const body = within(document.body);
    await userEvent.type(await body.findByLabelText('Поиск по названию'), 'Круги руками');
    await expect(body.getByText('Ничего не нашлось.')).toBeVisible();
  },
};
