import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planTemplates } from '../../../data/fixtures';
import { QuickAdd } from './QuickAdd';

const meta = {
  title: 'Features/Plan/QuickAdd',
  component: QuickAdd,
  args: { templates: planTemplates, onAdd: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План — пустой день» (быстрое добавление).' } } },
} satisfies Meta<typeof QuickAdd>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('button')).toHaveLength(4);
    await userEvent.click(c.getByRole('button', { name: /Кардио и пресс/ }));
    await expect(args.onAdd).toHaveBeenCalledWith('cardio');
  },
};

/** После импорта тренировок десятки: показываем первые шесть и «Показать все» */
const many = Array.from({ length: 26 }, (_, i) => ({ ...planTemplates[i % 4]!, id: `w${i}`, title: `Тренировка ${i + 1}` }));
export const ManyTemplates: Story = {
  args: { templates: many },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('button', { name: /Тренировка/ })).toHaveLength(6);
    await userEvent.click(c.getByRole('button', { name: 'Показать все 26' }));
    await expect(c.getAllByRole('button', { name: /Тренировка/ })).toHaveLength(26);
    await userEvent.click(c.getByRole('button', { name: 'Свернуть' }));
    await expect(c.getAllByRole('button', { name: /Тренировка/ })).toHaveLength(6);
  },
};

export const NoTemplates: Story = {
  args: { templates: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};
