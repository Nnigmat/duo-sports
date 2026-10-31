import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { todayFixture } from '../../../data/fixtures';
import { WeekCard } from './WeekCard';

const meta = {
  title: 'Features/Today/WeekCard',
  component: WeekCard,
  args: { days: todayFixture.week, onDayAction: fn() },
  parameters: {
    docs: { description: { component: 'Блок «Эта неделя»: счётчик «N из M», сегменты и ряд дней. До 768 px дни компактные, дальше с подписями.' } },
  },
} satisfies Meta<typeof WeekCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('2 из 4')).toBeInTheDocument();
    await expect(c.getByRole('progressbar', { name: 'Тренировки недели' })).toHaveAttribute('aria-valuenow', '2');
  },
};

export const SelectDay: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: /^сб/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: /^вс/ }));
    await expect(c.getByText('Воскресенье, 1 ноября · Запланировано')).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: 'Перенести' }));
    await expect(args.onDayAction).toHaveBeenCalledWith(6);
  },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText('Выполнено')).toHaveLength(2);
  },
};

export const AllDone: Story = {
  args: { days: todayFixture.week.map((d) => (d.status === 'rest' ? d : { ...d, status: 'done' as const, actionLabel: undefined })) },
};

export const OnlyRest: Story = {
  args: { days: todayFixture.week.map((d) => ({ ...d, status: 'rest' as const, actionLabel: undefined })) },
};
