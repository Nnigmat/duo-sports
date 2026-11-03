import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planFixture } from '../../../data/fixtures';
import { checkCopy, quickDates } from '../plan';
import { CopyPanel } from './CopyPanel';

const { today, max, entries, templates } = planFixture;
const source = '2026-10-31';
const titleOf = (id: string) => templates.find((t) => t.id === id)?.title ?? id;
const quick = quickDates(source, today, max, (d) => !!entries[d]);
const check = (date: string | null) => checkCopy(source, date, today, max, (d) => entries[d], titleOf);

const meta = {
  title: 'Features/Plan/CopyPanel',
  component: CopyPanel,
  args: {
    id: 'copy-panel',
    date: '2026-11-03',
    min: today,
    max,
    quick,
    check: check('2026-11-03'),
    onDateChange: fn(),
    onConfirm: fn(),
    onCancel: fn(),
  },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План — копия тренировки».' } } },
} satisfies Meta<typeof CopyPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FreeDay: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('group', { name: 'Копировать на другую дату' })).toBeVisible();
    await expect(c.getByText('Копия появится: вторник, 3 ноября.')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Создать копию' }));
    await expect(args.onConfirm).toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Отмена' }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};
export const ReplacesWorkout: Story = {
  args: { date: '2026-11-02', check: check('2026-11-02') },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Копия её заменит/)).toBeVisible();
    await expect(c.getByRole('button', { name: 'Заменить копией' })).toBeEnabled();
  },
};
export const SameDay: Story = {
  args: { date: source, check: check(source) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Создать копию' })).toBeDisabled();
    await expect(within(canvasElement).getByText('Это тот же день — выбери другую дату.')).toBeVisible();
  },
};
export const NoDate: Story = {
  args: { date: null, check: check(null) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Создать копию' })).toBeDisabled();
  },
};

function Live() {
  const [date, setDate] = useState<string | null>(quick[0]?.date ?? null);
  return <CopyPanel {...meta.args} date={date} check={check(date)} onDateChange={setDate} />;
}
export const Interactive: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /^Ближайший свободный/ }));
    await expect(c.getByRole('button', { name: /^Ближайший свободный/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByLabelText('Дата')).toHaveValue('2026-11-03');
    await userEvent.click(c.getByRole('button', { name: /^Завтра/ }));
    await expect(c.getByText(/Копия её заменит/)).toBeVisible();
  },
};
