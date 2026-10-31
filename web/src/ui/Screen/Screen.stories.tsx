import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { Text } from '../Text/Text';
import { Screen } from './Screen';

const meta = {
  title: 'UI/Screen',
  component: Screen,
  args: {
    label: 'Круг 1 из 3',
    back: { onClick: fn() },
    close: { onClick: fn() },
    children: <Text variant="body">Содержимое экрана</Text>,
  },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: `Шапка экрана тренировки: ← назад, название блока, ✕ выход. ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Screen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutClose: Story = { args: { close: undefined, label: 'Техника' } };
export const WithoutBack: Story = { args: { back: undefined, label: 'Финиш' } };
export const LongLabel: Story = { args: { label: 'Разминка — вращения плечами и головой по кругу' } };

export const Links: Story = {
  args: { back: { href: '#back' }, close: { href: '#close' } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('link', { name: 'Шаг назад' })).toBeInTheDocument();
    await expect(c.getByRole('link', { name: 'Закончить тренировку' })).toBeInTheDocument();
  },
};

export const Callbacks: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Шаг назад' }));
    await userEvent.click(c.getByRole('button', { name: 'Закончить тренировку' }));
    await expect(args.back?.onClick).toHaveBeenCalledTimes(1);
    await expect(args.close?.onClick).toHaveBeenCalledTimes(1);
  },
};
