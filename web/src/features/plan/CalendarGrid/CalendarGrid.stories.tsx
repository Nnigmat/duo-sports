import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planFixture } from '../../../data/fixtures';
import { CalendarGrid } from './CalendarGrid';

const meta = {
  title: 'Features/Plan/CalendarGrid',
  component: CalendarGrid,
  args: { data: planFixture, view: 'month', anchor: '2026-10-31', sel: '2026-10-31', onPick: fn() },
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План» (календарь, месяц и неделя).' } } },
} satisfies Meta<typeof CalendarGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    // Октябрь 2026: 35 клеток, 31 доступна, 4 чужих дня скрыты от скринридера
    await expect(c.getAllByRole('button')).toHaveLength(31);
    await expect(c.getByRole('button', { name: /^Суббота, 31 октября/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByText('→ на 31 октября')).toBeVisible();
    await expect(c.getByText('пропущена')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: /^Понедельник, 26 октября/ }));
    await expect(args.onPick).toHaveBeenCalledWith('2026-10-26');
  },
};
export const Week: Story = {
  args: { view: 'week' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('button')).toHaveLength(7);
    await expect(c.getAllByText(/^≈ \d+ мин$/).length).toBeGreaterThan(0);
  },
};
export const FirstMonthOfRange: Story = {
  args: { anchor: '2026-09-10', sel: '2026-09-10' },
  play: async ({ canvasElement }) => {
    // 1 сентября — начало календаря: клетки августа пустые и не нажимаются
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(30);
  },
};
export const CopyTargets: Story = {
  args: { copyDate: '2026-11-03', anchor: '2026-11-03' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('копия сюда')).toBeVisible();
  },
};
export const CopyReplaces: Story = {
  args: { copyDate: '2026-11-02', anchor: '2026-11-02' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('заменить копией')).toBeVisible();
  },
};
export const Mobile: Story = {
  args: { layout: 'mobile' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('перенесена')).toBeNull();
    await expect(within(canvasElement).getAllByRole('button')).toHaveLength(31);
  },
};
