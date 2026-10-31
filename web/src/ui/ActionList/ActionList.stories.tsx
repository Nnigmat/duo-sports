import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ActionList } from './ActionList';

const onSelect = fn();

const meta = {
  title: 'UI/ActionList',
  component: ActionList,
  args: {
    items: [
      { id: 'move', icon: 'loop', title: 'Перенести тренировку', description: 'На другой день этой недели', onSelect },
      { id: 'video', icon: 'video', title: 'Видео подходов', onSelect },
      { id: 'goal', icon: 'target', title: 'Цель недели', description: '3 тренировки', onSelect },
      { id: 'info', icon: 'info', title: 'О тренировке', onSelect },
    ],
  },
  decorators: [(Story) => <div style={{ maxWidth: 400 }}><Story /></div>],
} satisfies Meta<typeof ActionList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('button')).toHaveLength(4);
    await userEvent.click(c.getByRole('button', { name: /Перенести тренировку/ }));
    await expect(onSelect).toHaveBeenCalled();
  },
};
