import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planTemplates } from '../../../data/fixtures';
import { Row } from '../../../ui/storyKit';
import { CalendarCell } from './CalendarCell';

const legs = planTemplates.find((t) => t.id === 'legs')!;
const upper = planTemplates.find((t) => t.id === 'upper')!;

const meta = {
  title: 'Features/Plan/CalendarCell',
  component: CalendarCell,
  args: { date: '2026-11-02', view: 'month', template: upper, status: 'planned', onPick: fn() },
  decorators: [(Story) => <div style={{ width: 160 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План» (клетки календаря). На мобильном — число, метка типа и галочка у выполненных; слова в aria-label и в карточке дня.' } } },
} satisfies Meta<typeof CalendarCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Planned: Story = {
  play: async ({ canvasElement, args }) => {
    const b = within(canvasElement).getByRole('button', { name: 'Понедельник, 2 ноября: Верх тела' });
    await expect(b).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(b);
    await expect(args.onPick).toHaveBeenCalledWith('2026-11-02');
  },
};
export const Done: Story = {
  args: { date: '2026-10-26', status: 'done', past: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('✓ выполнена')).toBeVisible();
  },
};
export const TodaySelected: Story = {
  args: { date: '2026-10-31', template: legs, status: 'today', isToday: true, selected: true },
  play: async ({ canvasElement }) => {
    const b = within(canvasElement).getByRole('button', { name: 'Суббота, 31 октября: Ноги и ягодицы, сегодня' });
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(within(canvasElement).getByText('сегодня')).toBeVisible();
  },
};
export const Moved: Story = { args: { date: '2026-10-29', template: legs, status: 'moved', past: true } };
export const Skipped: Story = { args: { date: '2026-10-11', status: 'skipped', past: true } };
export const Empty: Story = { args: { date: '2026-11-03', template: undefined, status: undefined } };
export const CopyTargetFree: Story = {
  args: { date: '2026-11-03', template: undefined, status: undefined, copyTarget: 'new' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('копия сюда')).toBeVisible();
  },
};
export const CopyTargetReplace: Story = {
  args: { copyTarget: 'replace' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: /выбран для копии/ })).toBeVisible();
    await expect(within(canvasElement).getByText('заменить копией')).toBeVisible();
  },
};
export const WeekViewWithDuration: Story = {
  args: { view: 'week' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('≈ 55 мин')).toBeVisible();
  },
};
export const Outside: Story = {
  args: { outside: true, template: undefined, status: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};
export const Mobile: Story = {
  args: { layout: 'mobile', date: '2026-10-26', status: 'done', past: true },
  decorators: [(Story) => <div style={{ width: 52 }}><Story /></div>],
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const AllVariants: Story = {
  render: () => (
    <Row label="запланирована · сегодня · перенесена · пропущена · пусто">
      {([
        { date: '2026-11-02', status: 'planned', template: upper },
        { date: '2026-10-31', status: 'today', template: legs, isToday: true, selected: true },
        { date: '2026-10-29', status: 'moved', template: legs, past: true },
        { date: '2026-10-11', status: 'skipped', template: planTemplates[3], past: true },
        { date: '2026-11-03' },
      ] as const).map((p) => (
        <div key={p.date} style={{ width: 150 }}>
          <CalendarCell view="month" {...p} />
        </div>
      ))}
    </Row>
  ),
};
