import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../storyKit';
import { ParamStepper } from './ParamStepper';

const meta = {
  title: 'UI/ParamStepper',
  component: ParamStepper,
  args: { label: 'Вес', value: 60, unit: 'кг', onChange: () => {} },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `Параметры по умолчанию в форме упражнения. ${ARTIFACT}` } } },
} satisfies Meta<typeof ParamStepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Live() {
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(10);
  const [time, setTime] = useState(45);
  return (
    <Stack>
      <ParamStepper label="Вес" unit="кг" step={2.5} value={weight} onChange={setWeight} />
      <ParamStepper label="Повторы" unit="повт" value={reps} onChange={setReps} />
      <ParamStepper label="Время" unit="с" mode="duration" value={time} onChange={setTime} />
    </Stack>
  );
}
export const AllVariants: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вес: больше' }));
    await expect(c.getByLabelText('Вес')).toHaveValue('62,5');
    const reps = c.getByLabelText('Повторы');
    await userEvent.clear(reps);
    await userEvent.type(reps, '15');
    await userEvent.tab();
    await expect(reps).toHaveValue('15');
    await userEvent.click(c.getByRole('button', { name: 'Время: больше' }));
    await expect(c.getByText('00:50')).toBeInTheDocument();
  },
};

export const LiveTyping: Story = {
  tags: ['!dev', '!autodocs'],
  args: { label: 'Повторы', unit: 'повт', value: 10, live: true, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByLabelText('Повторы');
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    // Без blur: каждое валидное число уже ушло в onChange
    await expect(args.onChange).toHaveBeenNthCalledWith(1, 1);
    await expect(args.onChange).toHaveBeenLastCalledWith(12);
    await userEvent.type(input, 'x');
    await expect(args.onChange).toHaveBeenCalledTimes(2);
  },
};

/** По умолчанию число применяется только по blur или Enter */
export const DeferredTyping: Story = {
  tags: ['!dev', '!autodocs'],
  args: { label: 'Отсчёт', unit: 'с', value: 3, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByLabelText('Отсчёт');
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    await expect(args.onChange).not.toHaveBeenCalled();
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenLastCalledWith(12);
  },
};

export const DeferredEnter: Story = {
  tags: ['!dev', '!autodocs'],
  args: { label: 'Круги', unit: '', value: 3, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByLabelText('Круги');
    await userEvent.clear(input);
    await userEvent.type(input, '20');
    await expect(args.onChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenLastCalledWith(20);
  },
};
