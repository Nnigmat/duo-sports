import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { NewExerciseSheet } from './NewExerciseSheet';

const meta = {
  title: 'Features/Builder/NewExerciseSheet',
  component: NewExerciseSheet,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: {
    exercise: { name: 'Отжимания с хлопком', slug: 'clap-pushup', muscles: ['грудь'], kind: 'reps', equipment: [], notes: '', aliases: [], similar: 'Отжимания на брусьях' },
    onChange: fn(),
    onUseSimilar: fn(),
    onRemove: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof NewExerciseSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args }) => {
    const sheet = within(document.body);
    const muscles = await sheet.findByLabelText('Мышцы');
    await userEvent.type(muscles, ', трицепс');
    await userEvent.click(sheet.getByLabelText('Вес'));
    await expect(args.onChange).toHaveBeenCalledWith({ kind: 'weight' });
    await userEvent.click(sheet.getByRole('button', { name: 'Готово' }));
    await expect(args.onChange).toHaveBeenCalledWith(expect.objectContaining({ muscles: ['грудь', 'трицепс'] }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const EmptyName: Story = {
  play: async ({ args }) => {
    const sheet = within(document.body);
    await userEvent.clear(await sheet.findByLabelText('Название'));
    await userEvent.click(sheet.getByRole('button', { name: 'Готово' }));
    await expect(sheet.getByText('Введите название')).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const WithoutSimilar: Story = {
  args: { exercise: { name: 'Тяга резинки', slug: 'my-x', muscles: [], kind: 'reps', equipment: [], notes: '', aliases: [] } },
  play: async () => {
    const sheet = within(document.body);
    await expect(await sheet.findByRole('button', { name: 'Убрать из тренировки' })).toBeVisible();
    await expect(sheet.queryByRole('button', { name: /Использовать похожее/ })).toBeNull();
  },
};
