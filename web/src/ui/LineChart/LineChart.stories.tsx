import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { LineChart } from './LineChart';

type Pt = { shortLabel: string; ariaLabel: string; value: number };

const six: Pt[] = [
  { shortLabel: '5 сен', ariaLabel: '5 сентября: 74,2 кг', value: 74.2 },
  { shortLabel: '19 сен', ariaLabel: '19 сентября: 73,8 кг', value: 73.8 },
  { shortLabel: '3 окт', ariaLabel: '3 октября: 73,5 кг', value: 73.5 },
  { shortLabel: '17 окт', ariaLabel: '17 октября: 72,9 кг', value: 72.9 },
  { shortLabel: '31 окт', ariaLabel: '31 октября: 72,4 кг', value: 72.4 },
  { shortLabel: '14 ноя', ariaLabel: '14 ноября: 72 кг', value: 72 },
];

function Controlled({ points, initial, label }: { points: Pt[]; initial: number; label: string }) {
  const [selected, setSelected] = useState(initial);
  return <LineChart points={points} selected={selected} onSelect={setSelected} label={label} />;
}

const meta = {
  title: 'UI/LineChart',
  component: LineChart,
  args: { points: six, selected: 5, onSelect: () => {}, label: 'Вес с 5 сентября по 14 ноября: от 74,2 до 72 кг' },
  render: (args) => <Controlled points={args.points} initial={args.selected} label={args.label} />,
  parameters: {
    layout: 'padded',
    docs: { description: { component: `Линия динамики с выбором точки: точки — кнопки 44 px, выбранная крупнее и залита. Артборд «07 · Статистика замеров». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof LineChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const buttons = c.getAllByRole('button');
    await expect(buttons).toHaveLength(6);
    await expect(buttons[5]).toHaveAttribute('aria-pressed', 'true');
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(c.getByRole('button', { name: '5 сентября: 74,2 кг' }));
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    await expect(buttons[5]).toHaveAttribute('aria-pressed', 'false');
  },
};

export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const buttons = c.getAllByRole('button');
    buttons[0].focus();
    await userEvent.keyboard('{Enter}');
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
  },
};

export const SelectedLabelIsBold: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(Number(getComputedStyle(c.getByText('14 ноя')).fontWeight)).toBeGreaterThanOrEqual(600);
    await expect(Number(getComputedStyle(c.getByText('5 сен')).fontWeight)).toBeLessThan(600);
  },
};

export const SinglePoint: Story = {
  args: { points: six.slice(5), selected: 0, label: 'Вес, один замер: 72 кг' },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button');
    await expect(buttons).toHaveLength(1);
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  },
};

export const TwoPoints: Story = {
  args: { points: six.slice(4), selected: 1, label: 'Вес: от 72,4 до 72 кг' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(2);
  },
};

export const Flat: Story = {
  args: {
    points: [
      { shortLabel: '3 окт', ariaLabel: '3 октября: 56 см', value: 56 },
      { shortLabel: '17 окт', ariaLabel: '17 октября: 56 см', value: 56 },
      { shortLabel: '31 окт', ariaLabel: '31 октября: 56 см', value: 56 },
    ],
    selected: 2,
    label: 'Бедро: 56 см без изменений',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(3);
  },
};
