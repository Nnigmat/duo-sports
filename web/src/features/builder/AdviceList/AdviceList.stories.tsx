import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AdviceList } from './AdviceList';

const meta = {
  title: 'Features/Builder/AdviceList',
  component: AdviceList,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: {
    advice: [
      { id: 'a0', text: 'В библиотеке есть похожее — Отжимания на брусьях', exercise: 'Отжимания с хлопком', suggest: 'Отжимания на брусьях' },
      { id: 'missing-dips', text: 'Нет выбранного упражнения: Подтягивания' },
    ],
    onApply: fn(),
    onDismiss: fn(),
  },
} satisfies Meta<typeof AdviceList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Заменить на „Отжимания на брусьях“' }));
    await expect(args.onApply).toHaveBeenCalledWith('a0');
    await expect(c.getAllByRole('button', { name: /Заменить/ })).toHaveLength(1);
    await userEvent.click(c.getAllByRole('button', { name: 'Скрыть заметку' })[1]!);
    await expect(args.onDismiss).toHaveBeenCalledWith('missing-dips');
  },
};
