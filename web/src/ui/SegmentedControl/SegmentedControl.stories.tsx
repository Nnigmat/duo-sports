import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../storyKit';
import { SegmentedControl } from './SegmentedControl';

const two = [
  { value: 'one', label: 'Упражнение · 5' },
  { value: 'all', label: 'Все · 23' },
];
const three = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
];

function Controlled({ options, initial, label }: { options: typeof two; initial: string; label: string }) {
  const [value, setValue] = useState(initial);
  return <SegmentedControl label={label} options={options} value={value} onChange={setValue} />;
}

const meta = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  args: { label: 'Какие комментарии показать', options: two, value: 'one', onChange: () => {} },
  render: (args) => <Controlled options={args.options} initial={args.value} label={args.label} />,
  parameters: {
    docs: { description: { component: `Артборд «Все комментарии тренера» (переключатель «Упражнение · 5 / Все · 23»). ${ARTIFACT}` } },
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const [first, second] = c.getAllByRole('tab');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(second);
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('aria-selected', 'false');
  },
};

export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const [first, second] = c.getAllByRole('tab');
    await userEvent.tab();
    await expect(first).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(second).toHaveFocus();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}');
    await expect(second).toHaveAttribute('aria-selected', 'true');
  },
};

export const ThreeOptions: Story = { args: { label: 'Период', options: three, value: 'month' } };

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Controlled label="Комментарии" options={two} initial="one" />
      <Controlled label="Период" options={three} initial="month" />
    </Stack>
  ),
};
