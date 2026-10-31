import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, within } from 'storybook/test';
import { scheduleFixture } from '../../../data/fixtures';
import { RescheduleSheet } from './RescheduleSheet';

const meta = {
  title: 'Features/Schedule/RescheduleSheet',
  component: RescheduleSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    data: scheduleFixture,
    onConfirm: fn(),
    onSkip: fn(),
    onPause: fn(),
  },
  parameters: {
    docs: { description: { component: 'Панель «Перенести тренировку»: день этой недели, день следующей недели, что будет с серией. Артборд «Телефон · Перенести тренировку».' } },
  },
} satisfies Meta<typeof RescheduleSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SameWeek: Story = {
  play: async ({ args }) => {
    const sheet = within(screen.getByRole('dialog'));
    await expect(sheet.getByRole('status')).toHaveTextContent('сохранится');
    await userEvent.click(sheet.getByRole('button', { name: 'Перенести на вс, 1 ноября' }));
    await expect(args.onConfirm).toHaveBeenCalledWith('2026-11-01');
  },
};

export const NextWeek: Story = {
  play: async ({ args }) => {
    const sheet = within(screen.getByRole('dialog'));
    await userEvent.click(sheet.getByRole('radio', { name: /^вт, 3 ноября/ }));
    await expect(sheet.getByRole('status')).toHaveTextContent('Серия «Без пропусков» прервётся');
    await userEvent.click(sheet.getByRole('button', { name: 'Перенести на вт, 3 ноября' }));
    await expect(args.onConfirm).toHaveBeenCalledWith('2026-11-03');
  },
};

export const NextWeekBusyDay: Story = {
  play: async () => {
    const sheet = within(screen.getByRole('dialog'));
    await userEvent.click(sheet.getByRole('radio', { name: /^ср, 4 ноября/ }));
    await expect(sheet.getByRole('status')).toHaveTextContent('В этот день уже «Кардио и пресс»');
  },
};

export const Skip: Story = {
  play: async ({ args }) => {
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Пропустить тренировку/ }));
    await expect(args.onSkip).toHaveBeenCalledTimes(1);
  },
};

export const WeekIsOver: Story = {
  args: { data: { ...scheduleFixture, sameWeek: null } },
};
