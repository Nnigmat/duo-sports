import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row } from '../storyKit';
import { Chip } from './Chip';

const meta = {
  title: 'UI/Chip',
  component: Chip,
  args: { pressed: false, children: '0:45' },
  argTypes: { pressed: { control: 'boolean' }, disabled: { control: 'boolean' } },
  parameters: {
    docs: { description: { component: `Артборд «Время — изменить» (пресеты 0:30 · 0:45 · 1:00 · 1:30). ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pressed: Story = { args: { pressed: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button')).toHaveFocus();
  },
};

function Presets() {
  const [value, setValue] = useState(45);
  return (
    <Row label="пресеты">
      {[30, 45, 60, 90].map((s) => (
        <Chip key={s} pressed={value === s} onClick={() => setValue(s)}>
          {`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}
        </Chip>
      ))}
    </Row>
  );
}

export const AllVariants: Story = {
  render: () => <Presets />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: '0:45' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: '1:30' }));
    await expect(c.getByRole('button', { name: '1:30' })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByRole('button', { name: '0:45' })).toHaveAttribute('aria-pressed', 'false');
  },
};

export const WithCount: Story = { args: { children: 'Ноги', count: 8 } };
export const PressedWithCount: Story = { args: { children: 'Ноги', count: 8, pressed: true } };
