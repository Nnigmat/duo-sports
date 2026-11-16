import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { MultiLineChart } from './MultiLineChart';

const dates = [
  { shortLabel: '5 сен', ariaLabel: '5 сентября' },
  { shortLabel: '19 сен', ariaLabel: '19 сентября' },
  { shortLabel: '3 окт', ariaLabel: '3 октября' },
  { shortLabel: '17 окт', ariaLabel: '17 октября' },
  { shortLabel: '31 окт', ariaLabel: '31 октября' },
  { shortLabel: '14 ноя', ariaLabel: '14 ноября' },
];

const lines = [
  { id: 'weight', values: [0, -0.4, -0.7, -1.3, -1.8, -2.2], color: 'var(--series-weight)', emphasis: true },
  { id: 'waist', values: [0, -1, -1, -2, -3, -4], color: 'var(--series-waist)' },
  { id: 'chest', values: [0, 0.5, 1, 1, 1.5, 2], color: 'var(--series-chest)' },
];

type Args = React.ComponentProps<typeof MultiLineChart>;

function Controlled(args: Args) {
  const [selected, setSelected] = useState(args.selected);
  return (
    <MultiLineChart
      {...args}
      selected={selected}
      onSelect={(i) => {
        setSelected(i);
        args.onSelect(i);
      }}
    />
  );
}

const meta = {
  title: 'UI/MultiLineChart',
  component: MultiLineChart,
  args: {
    dates,
    lines,
    selected: 5,
    onSelect: fn(),
    label: 'Изменения с 5 сентября по 14 ноября',
    minSpan: 2,
    formatTick: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}`,
  },
  render: (args) => <Controlled {...args} />,
  parameters: {
    layout: 'padded',
    docs: { description: { component: `Несколько линий изменений на одном графике; даты выбираются вертикальными полосами. ${ARTIFACT}` } },
  },
} satisfies Meta<typeof MultiLineChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const buttons = c.getAllByRole('button');
    await expect(buttons).toHaveLength(6);
    await expect(buttons[5]).toHaveAttribute('aria-pressed', 'true');
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    await expect(c.getByText('14 ноя')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '5 сентября' }));
    await expect(args.onSelect).toHaveBeenLastCalledWith(0);
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  },
};

export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const buttons = within(canvasElement).getAllByRole('button');
    buttons[0].focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenLastCalledWith(0);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenLastCalledWith(1);
  },
};

export const WithGaps: Story = {
  args: {
    lines: [
      lines[0],
      { id: 'waist', values: [0, null, -1, null, -3, -4], color: 'var(--series-waist)' },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(6);
    await expect(canvasElement.querySelector('circle')).toBeNull();
  },
};

export const SinglePoint: Story = {
  args: {
    lines: [lines[0], { id: 'calf', values: [null, null, null, null, null, -1], color: 'var(--series-calf)' }],
  },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('path[data-line="calf"]');
    await expect(dot).not.toBeNull();
    await expect(dot?.getAttribute('d')).toMatch(/^M[\d.]+ [\d.]+ l0 0$/);
    await expect(canvasElement.querySelector('circle')).toBeNull();
    await expect(within(canvasElement).getByText('14 ноя')).toBeVisible();
  },
};

export const Flat: Story = {
  args: { lines: [{ id: 'weight', values: [0, 0, 0, 0, 0, 0], color: 'var(--series-weight)' }] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(6);
  },
};

export const OneDate: Story = {
  args: {
    dates: dates.slice(5),
    lines: [{ id: 'weight', values: [0], color: 'var(--series-weight)' }],
    selected: 0,
  },
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button');
    await expect(buttons).toHaveLength(1);
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    await expect(canvasElement.querySelector('path[data-line="weight"]')).not.toBeNull();
  },
};

export const AllNegative: Story = {
  args: { lines: [lines[0], { id: 'waist', values: [0, -1, -1, -2, -3, -4], color: 'var(--series-waist)' }] },
  play: async ({ canvasElement }) => {
    const labels = [...canvasElement.querySelectorAll('span[class*="yTick"]')].map((el) => el.textContent);
    await expect(labels.filter((t) => t === '0,0')).toHaveLength(1);
    await expect(new Set(labels).size).toBe(labels.length);
  },
};
