import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { QuickExerciseForm } from './QuickExerciseForm';

const never = () => new Promise<void>(() => {});

const meta = {
  title: 'Features/Exercises/QuickExerciseForm',
  component: QuickExerciseForm,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: { initialName: 'Выпады назад', onCreate: fn(never) },
  parameters: { docs: { description: { component: 'Создание упражнения прямо в окне выбора: название из поиска и тип.' } } },
} satisfies Meta<typeof QuickExerciseForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    expect(c.getByLabelText('Название')).toHaveValue('Выпады назад');
    const add = c.getByRole('button', { name: 'Добавить' });
    await userEvent.dblClick(add);
    expect(args.onCreate).toHaveBeenCalledTimes(1);
    expect(args.onCreate).toHaveBeenCalledWith('Выпады назад', 'reps');
  },
};

export const Trimmed: Story = {
  args: { initialName: '' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Название'), '  Планка  ');
    await userEvent.click(c.getByRole('tab', { name: 'На время' }));
    await userEvent.click(c.getByRole('button', { name: 'Добавить' }));
    expect(args.onCreate).toHaveBeenCalledWith('Планка', 'time');
  },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.clear(c.getByLabelText('Название'));
    expect(c.getByRole('button', { name: 'Добавить' })).toBeDisabled();
  },
};

export const Failed: Story = {
  args: { onCreate: fn(async () => Promise.reject(new Error('Упражнение с таким названием уже есть'))) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Добавить' }));
    await waitFor(() => expect(c.getByText('Упражнение с таким названием уже есть')).toBeVisible());
    expect(c.getByLabelText('Название')).toHaveValue('Выпады назад');
    expect(c.getByRole('button', { name: 'Добавить' })).toBeEnabled();
  },
};
