import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { todayDoneFixture, todayFixture, todayRestFixture, todayReviewFixture } from '../../../data/fixtures';
import { TodayView } from './TodayView';

const meta = {
  title: 'Features/Today/TodayView',
  component: TodayView,
  args: {
    data: todayFixture,
    onStart: fn(),
    onReschedule: fn(),
    onOpenExercises: fn(),
    onStretch: fn(),
    onTrainAnyway: fn(),
    onOpenSummary: fn(),
    onOpenAchievements: fn(),
    onOpenLatestAchievement: fn(),
    onOpenProgress: fn(),
    onWeekDayAction: fn(),
  },
  parameters: {
    docs: { description: { component: 'Главная: шапка, чибик с карточкой дня и неделя. Артборды «Сегодня» (десктоп и телефон).' } },
  },
} satisfies Meta<typeof TodayView>;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: 'desktop', isRotated: false } };

export const Workout: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Привет, Никита');
    for (const name of ['Достижения', 'Неделя в цифрах', 'Рекорды', 'Активность']) {
      await expect(c.getByRole('region', { name })).toBeVisible();
    }
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    await userEvent.click(c.getByRole('button', { name: 'Перенести' }));
    await expect(args.onReschedule).toHaveBeenCalledTimes(1);
  },
};
export const WithReview: Story = {
  args: { data: todayReviewFixture, reviewHref: '/review/7', onOpenReview: fn(), onDismissReview: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Тренер разобрал «Ноги и ягодицы»' })).toBeVisible();
    await expect(c.getByText(/2 видео отправлены, тренер ещё не посмотрел/)).toBeVisible();
    await expect(c.getByRole('link', { name: 'Уведомления, 1 новое' })).toBeVisible();
    await userEvent.click(c.getByRole('link', { name: 'Посмотреть разбор' }));
    await expect(args.onOpenReview).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Скрыть' }));
    await expect(args.onDismissReview).toHaveBeenCalledTimes(1);
  },
};
export const Rest: Story = { args: { data: todayRestFixture } };
export const Done: Story = { args: { data: todayDoneFixture } };

export const WorkoutDesktop: Story = {
  globals: desktop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const name of ['Достижения', 'Неделя в цифрах', 'Рекорды', 'Активность']) {
      await expect(c.getByRole('region', { name })).toBeVisible();
    }
  },
};
export const WithoutInsights: Story = {
  args: { data: { ...todayFixture, insights: undefined } },
  globals: desktop,
};
export const RestDesktop: Story = { args: Rest.args, globals: desktop };
export const DoneDesktop: Story = { args: Done.args, globals: desktop };
