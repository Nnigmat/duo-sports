import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { PastComments } from './PastComments';

const all = [
  { id: '1', date: '2026-10-29', timecodeSec: 21, text: 'Колени уходят внутрь, думай «раздвинуть пол».' },
  { id: '2', date: '2026-10-22', timecodeSec: null, text: 'Глубина хорошая, держим.' },
  { id: '3', date: '2026-10-15', timecodeSec: 9, text: 'Спина округляется на последнем повторе. '.repeat(4) },
  { id: '4', date: '2026-10-08', timecodeSec: null, text: 'Начинаем с пустого грифа.' },
  { id: '5', date: '2026-10-01', timecodeSec: null, text: 'Первая тренировка, ставим базу.' },
];

const meta = {
  title: 'UI/PastComments',
  component: PastComments,
  args: { items: all },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `Три последних комментария к упражнению; больше трёх — «Показать все · N». ${ARTIFACT}` } } },
} satisfies Meta<typeof PastComments>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(c.getByRole('button', { name: 'Показать все · 5' }));
    await expect(c.getAllByRole('listitem')).toHaveLength(5);
    await expect(c.queryByRole('button')).toBeNull();
  },
};
export const ThreeOrLess: Story = {
  args: { items: all.slice(0, 3) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};
export const ShowAllCallback: Story = {
  args: { onShowAll: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Показать все/ }));
    await expect(args.onShowAll).toHaveBeenCalled();
  },
};
export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('Прошлые комментарии')).toBeNull();
  },
};
