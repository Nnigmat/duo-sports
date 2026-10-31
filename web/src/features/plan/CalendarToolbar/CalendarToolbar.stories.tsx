import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { CalendarView } from '../plan';
import { CalendarToolbar } from './CalendarToolbar';

const meta = {
  title: 'Features/Plan/CalendarToolbar',
  component: CalendarToolbar,
  args: {
    titleId: 'cal-title',
    title: 'Октябрь 2026',
    view: 'month',
    canPrev: true,
    canNext: true,
    onPrev: fn(),
    onNext: fn(),
    onToday: fn(),
    onViewChange: fn(),
  },
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План» (шапка календаря).' } } },
} satisfies Meta<typeof CalendarToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Октябрь 2026' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Назад' }));
    await userEvent.click(c.getByRole('button', { name: 'Вперёд' }));
    await userEvent.click(c.getByRole('button', { name: 'Сегодня' }));
    await userEvent.click(c.getByRole('tab', { name: 'Неделя' }));
    await expect(args.onPrev).toHaveBeenCalled();
    await expect(args.onNext).toHaveBeenCalled();
    await expect(args.onToday).toHaveBeenCalled();
    await expect(args.onViewChange).toHaveBeenCalledWith('week');
  },
};
export const WeekView: Story = { args: { view: 'week', title: '26 октября – 1 ноября' } };
export const EdgeOfRange: Story = {
  args: { canPrev: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Назад' })).toBeDisabled();
  },
};

function Live() {
  const [view, setView] = useState<CalendarView>('month');
  return <CalendarToolbar {...meta.args} view={view} title={view === 'month' ? 'Октябрь 2026' : '26 октября – 1 ноября'} onViewChange={setView} />;
}
export const Interactive: Story = {
  render: () => <Live />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('tab', { name: 'Неделя' }));
    await expect(c.getByRole('tab', { name: 'Неделя' })).toHaveAttribute('aria-selected', 'true');
    await expect(c.getByRole('heading', { level: 2 })).toHaveTextContent('26 октября – 1 ноября');
  },
};
