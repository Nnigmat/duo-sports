import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../storyKit';
import { Stepper } from './Stepper';

const meta = {
  title: 'UI/Stepper',
  component: Stepper,
  args: { label: 'Повторения', value: 18, onChange: () => {}, hint: 'План: 18–20', min: 0, step: 1 },
  argTypes: {
    mode: { control: 'inline-radio', options: ['number', 'duration'] },
    value: { control: 'number' },
    step: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    error: { control: 'text' },
  },
  // Значение живёт в состоянии, чтобы кнопки работали и в Controls
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <Stepper {...args} value={value} onChange={setValue} />;
  },
  parameters: {
    docs: { description: { component: `Артборды «Изменить подход» (повторы, вес), «Повторы + вес — изменить» и «Время — изменить» (режим duration, мм:сс). ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const value = c.getByRole('status');
    await expect(value).toHaveTextContent('18');
    await userEvent.click(c.getByRole('button', { name: 'Больше' }));
    await expect(value).toHaveTextContent('19');
    await userEvent.click(c.getByRole('button', { name: 'Меньше' }));
    await userEvent.click(c.getByRole('button', { name: 'Меньше' }));
    await expect(value).toHaveTextContent('17');
  },
};

export const Weight: Story = {
  args: { label: 'Доп. вес, кг', value: 2.5, step: 0.5, hint: 'Шаг 0,5 кг' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Больше' }));
    await expect(c.getByRole('status')).toHaveTextContent('5');
    await userEvent.click(c.getByRole('button', { name: 'Больше' }));
    await expect(c.getByRole('status')).toHaveTextContent('7,5');
  },
};

export const Duration: Story = {
  args: { label: 'Время, мм:сс', mode: 'duration', value: 45, step: 5, min: 5, hint: 'План: 00:45' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('status')).toHaveTextContent('00:45');
    await userEvent.click(c.getByRole('button', { name: '+5 с' }));
    await userEvent.click(c.getByRole('button', { name: '+5 с' }));
    await userEvent.click(c.getByRole('button', { name: '+5 с' }));
    await expect(c.getByRole('status')).toHaveTextContent('01:00');
    await userEvent.click(c.getByRole('button', { name: '−5 с' }));
    await expect(c.getByRole('status')).toHaveTextContent('00:55');
  },
};

export const AtMin: Story = {
  args: { value: 1, min: 0, max: 2, hint: 'От 0 до 2' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Меньше' }));
    await expect(c.getByRole('status')).toHaveTextContent('0');
    await expect(c.getByRole('button', { name: 'Меньше' })).toBeDisabled();
    await userEvent.click(c.getByRole('button', { name: 'Больше' }));
    await userEvent.click(c.getByRole('button', { name: 'Больше' }));
    await expect(c.getByRole('status')).toHaveTextContent('2');
    await expect(c.getByRole('button', { name: 'Больше' })).toBeDisabled();
  },
};

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button', { name: 'Меньше' })).toHaveFocus();
  },
};

export const WithError: Story = {
  args: { value: 0, hint: undefined, error: 'Нужно хотя бы одно повторение' },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Stepper label="Повторения" value={18} onChange={() => {}} hint="План: 18–20" />
      <Stepper label="Доп. вес, кг" value={2.5} step={0.5} onChange={() => {}} hint="Шаг 0,5 кг" />
      <Stepper label="Время, мм:сс" mode="duration" value={45} onChange={() => {}} hint="План: 00:45" />
      <Stepper label="Минимум" value={0} onChange={() => {}} hint="Кнопка − недоступна" />
      <Stepper label="Ошибка" value={0} onChange={() => {}} error="Нужно хотя бы одно повторение" />
    </Stack>
  ),
};
