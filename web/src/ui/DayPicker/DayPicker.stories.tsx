import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { DayPicker, type PickerDay } from './DayPicker';

const WEEK: PickerDay[] = [
  { date: '2026-11-02', weekday: 'пн', day: '2' },
  { date: '2026-11-03', weekday: 'вт', day: '3' },
  { date: '2026-11-04', weekday: 'ср', day: '4', busy: 'Кардио и пресс' },
  { date: '2026-11-05', weekday: 'чт', day: '5' },
  { date: '2026-11-06', weekday: 'пт', day: '6' },
  { date: '2026-11-07', weekday: 'сб', day: '7', busy: 'Ноги' },
  { date: '2026-11-08', weekday: 'вс', day: '8' },
];

const meta = {
  title: 'UI/DayPicker',
  component: DayPicker,
  args: { label: 'Новый день тренировки', days: WEEK, onChange: () => {} },
} satisfies Meta<typeof DayPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { value: '2026-11-05' } };

function Controlled() {
  const [v, setV] = useState<string | undefined>('2026-11-03');
  return <DayPicker label="Новый день тренировки" days={WEEK} value={v} onChange={setV} />;
}

export const AllVariants: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('radiogroup', { name: 'Новый день тренировки' })).toBeInTheDocument();
    await expect(c.getByRole('radio', { name: 'ср, 4 ноября, уже стоит: Кардио и пресс' })).toBeInTheDocument();
    await expect(c.getByRole('radio', { name: 'вт, 3 ноября' })).toBeChecked();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await expect(c.getByRole('radio', { name: /ср, 4 ноября/ })).toBeChecked();
    await expect(c.getByRole('radio', { name: /ср, 4 ноября/ })).toHaveFocus();
  },
};
