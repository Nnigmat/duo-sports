import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { MeasureRow } from './MeasureRow';

function Controlled(props: { previous: number | null; initial?: string; active?: boolean }) {
  const [value, setValue] = useState(props.initial ?? '');
  const [active, setActive] = useState(props.active ?? false);
  return (
    <MeasureRow
      id="waist"
      label="Талия"
      unit="см"
      previous={props.previous}
      value={value}
      active={active}
      onChange={setValue}
      onFocus={() => setActive(true)}
    />
  );
}

const meta = {
  title: 'UI/MeasureRow',
  component: MeasureRow,
  args: {
    id: 'waist',
    label: 'Талия',
    unit: 'см',
    previous: 81,
    value: '',
    active: false,
    onChange: fn(),
    onFocus: fn(),
  },
  parameters: {
    layout: 'padded',
    docs: { description: { component: `Строка замера: подпись, «было X → изменение» и поле с единицей. Вся строка — label поля. Артборд «06 · Замеры». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof MeasureRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText('Талия');
    await expect(input.tagName).toBe('INPUT');
    await expect(input).toHaveAttribute('placeholder', '81');
    await expect(c.getByText('было 81')).toBeVisible();
  },
};

export const Filled: Story = {
  args: { value: '80,5' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('было 81 → −0,5')).toBeVisible();
  },
};

export const NoPrevious: Story = {
  args: { previous: null, value: '80' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('первый замер')).toBeVisible();
    await expect(c.getByLabelText('Талия')).not.toHaveAttribute('placeholder', 'NaN');
  },
};

export const NoChange: Story = {
  args: { value: '81' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('было 81 → без изменений')).toBeVisible();
  },
};

export const Active: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Талия');
    await expect(input.closest('[data-active]')).toHaveAttribute('data-active', 'true');
  },
};

export const InvalidTextIsDropped: Story = {
  render: () => <Controlled previous={81} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText('Талия');
    await userEvent.type(input, 'abc');
    await expect(input).toHaveValue('');
    await expect(c.getByText('было 81')).toBeVisible();
  },
};

export const Interactive: Story = {
  render: () => <Controlled previous={81} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText('Талия');
    await userEvent.type(input, '80,5');
    await expect(input).toHaveValue('80,5');
    await expect(c.getByText('было 81 → −0,5')).toBeVisible();
    await userEvent.clear(input);
    await userEvent.type(input, 'ab1');
    await expect(input).toHaveValue('1');
    await expect(c.getByText('было 81 → −80')).toBeVisible();
  },
};

export const CallsHandlers: Story = {
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByLabelText('Талия');
    await userEvent.click(input);
    await expect(args.onFocus).toHaveBeenCalled();
    await userEvent.type(input, '80,5');
    await expect(args.onChange).toHaveBeenLastCalledWith('5');
  },
};
