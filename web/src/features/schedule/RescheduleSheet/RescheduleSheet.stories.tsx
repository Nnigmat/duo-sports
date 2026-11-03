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
    today: '2026-10-31',
    onConfirm: fn(),
    onSkip: fn(),
    onPause: fn(),
  },
  parameters: {
    docs: { description: { component: 'Панель «Перенести тренировку»: неделя с переключателем вперёд и назад, любой день от сегодняшнего, что будет с серией. Артборд «Телефон · Перенести тренировку».' } },
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
    await userEvent.click(sheet.getByRole('button', { name: 'Следующая неделя' }));
    await userEvent.click(sheet.getByRole('radio', { name: /^вт, 3 ноября/ }));
    await expect(sheet.getByRole('status')).toHaveTextContent('Серия «Без пропусков» прервётся');
    await userEvent.click(sheet.getByRole('button', { name: 'Перенести на вт, 3 ноября' }));
    await expect(args.onConfirm).toHaveBeenCalledWith('2026-11-03');
  },
};

export const NextWeekBusyDay: Story = {
  play: async () => {
    const sheet = within(screen.getByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: 'Следующая неделя' }));
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

export const FarWeek: Story = {
  play: async ({ args }) => {
    const sheet = within(screen.getByRole('dialog'));
    const next = sheet.getByRole('button', { name: 'Следующая неделя' });
    await userEvent.click(next);
    await userEvent.click(next);
    await userEvent.click(next);
    await userEvent.click(sheet.getByRole('radio', { name: /^пн, 16 ноября/ }));
    await userEvent.click(sheet.getByRole('button', { name: 'Перенести на пн, 16 ноября' }));
    await expect(args.onConfirm).toHaveBeenCalledWith('2026-11-16');
  },
};

export const NoPast: Story = {
  play: async () => {
    const sheet = within(screen.getByRole('dialog'));
    await expect(sheet.getByRole('radio', { name: /^пн, 26 октября/ })).toBeDisabled();
    await userEvent.click(sheet.getByRole('button', { name: 'Следующая неделя' }));
    await expect(sheet.getByRole('button', { name: 'Предыдущая неделя' })).toBeEnabled();
    await userEvent.click(sheet.getByRole('button', { name: 'Предыдущая неделя' }));
    await expect(sheet.getByRole('button', { name: 'Предыдущая неделя' })).toBeDisabled();
  },
};
