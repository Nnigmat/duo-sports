import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { EquipmentListView } from './EquipmentListView';

const meta = {
  title: 'Features/Equipment/EquipmentListView',
  component: EquipmentListView,
  args: {
    items: [
      { id: '1', name: 'Коврик', exercises: 7 },
      { id: '2', name: 'Скамья', exercises: 4 },
      { id: '3', name: 'Эспандер', exercises: 0 },
    ],
    onAdd: fn(async () => {}),
  },
} satisfies Meta<typeof EquipmentListView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 1 })).toHaveTextContent('Инвентарь');
  },
};
export const Empty: Story = { args: { items: [] } };
export const Desktop: Story = { args: { layout: 'desktop' }, globals: { viewport: { value: 'desktop', isRotated: false } } };
export const Add: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Новый инвентарь' }));
    const sheet = within(document.body);
    await userEvent.type(await sheet.findByLabelText('Название'), 'Гриф');
    await userEvent.click(sheet.getByRole('button', { name: 'Добавить' }));
    await expect(args.onAdd).toHaveBeenCalledWith('Гриф');
  },
};
