import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { EXERCISE_FIELDS, TOP_FIELDS } from '../format';
import { FieldTable } from './FieldTable';

const meta = {
  title: 'Features/Import/FieldTable',
  component: FieldTable,
  args: { rows: TOP_FIELDS, caption: 'Поля верхнего уровня', valueHeader: 'Значение' },
  parameters: { docs: { description: { component: 'Артборд «Импорт · Описание формата»: таблицы полей. Обязательность — словом рядом с именем.' } } },
} satisfies Meta<typeof FieldTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TopLevel: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('row')).toHaveLength(7);
    await expect(c.getAllByText('обязательно')).toHaveLength(2);
    await expect(c.getByRole('columnheader', { name: 'Значение' })).toBeVisible();
  },
};

export const Exercise: Story = {
  args: { rows: EXERCISE_FIELDS, caption: 'Поля упражнения', valueHeader: 'Пример' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('или exercise_id')).toBeVisible();
    await expect(c.getByRole('rowheader', { name: /^per_side/ })).toBeVisible();
  },
};
