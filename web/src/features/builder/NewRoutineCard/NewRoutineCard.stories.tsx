import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { NewRoutineCard } from './NewRoutineCard';

const meta = {
  title: 'Features/Builder/NewRoutineCard',
  component: NewRoutineCard,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: {
    label: 'Разминка',
    pick: { kind: 'new', title: 'Суставная, акцент на плечи', items: [{ name: 'Вращение руками', sec: 30, sides: ['вперёд', 'назад'] }, { name: 'Наклоны головы', sec: 45 }] },
    onRename: fn(),
    onSec: fn(),
    onMove: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof NewRoutineCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('новая разминка')).toBeVisible();
    await expect(c.getByText('на сторону')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Наклоны головы: выше' }));
    await expect(args.onMove).toHaveBeenCalledWith(1, -1);
    await expect(c.getByRole('button', { name: 'Вращение руками: выше' })).toBeDisabled();
  },
};

export const Empty: Story = {
  args: { label: 'Заминка', pick: { kind: 'new', title: 'Растяжка', items: [] } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('новая заминка')).toBeVisible();
    await expect(within(canvasElement).getByText('Нет упражнений')).toBeVisible();
  },
};
