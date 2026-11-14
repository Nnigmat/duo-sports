import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { reviewFixture, reviewFoldedCommentFixture, reviewFoldedFixture, reviewPendingFixture } from '../fixtures';
import { ReviewView } from './ReviewView';

const onReply = fn();

const meta = {
  title: 'Features/Review/ReviewView',
  component: ReviewView,
  args: {
    review: reviewFixture,
    onBack: fn(),
    videoHref: (id: string, t?: number) => `/review/video/${id}${t === undefined ? '' : `?t=${t}`}`,
    onOpenVideo: fn(),
    onReply,
    planHref: '/plan',
    onOpenPlan: fn(),
  },
  beforeEach: () => {
    onReply.mockReset().mockResolvedValue(undefined);
  },
  parameters: { docs: { description: { component: 'Разбор для ученика: комментарии по упражнениям, видео, ответы, подсказки. Артборд «Ученик · Разбор от тренера».' } } },
} satisfies Meta<typeof ReviewView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Тренер разобрал тренировку')).toBeVisible();
    await expect(c.getByRole('heading', { level: 1, name: 'Ноги и ягодицы' })).toBeVisible();
    await expect(c.getByText('Ты написал')).toBeVisible();
    await expect(c.getByText('3 новых')).toBeVisible();
    await expect(c.getByRole('heading', { name: 'Подсказки от тренера' })).toBeVisible();
    await userEvent.click(c.getByRole('link', { name: /Подход 4 · 80.кг × 5.*Смотреть с комментариями/ }));
    await expect(args.onOpenVideo).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    await userEvent.click(c.getAllByRole('button', { name: 'Перейти к 0:21' })[0]!);
    await expect(args.onOpenVideo).toHaveBeenLastCalledWith('11111111-1111-4111-8111-111111111111', 21);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

const NB = '\u00a0';
const addFact = (e: (typeof reviewFixture.exercises)[number]) => ({ ...e, sets: e.sets.map((st) => (st.videoId ? { ...st, actualLabel: `85${NB}кг × 7`, factMark: 'Больше плана' as const } : st)) });
const withVideoFact = {
  ...reviewFixture,
  exercises: reviewFixture.exercises.map(addFact),
  sections: reviewFixture.sections.map((sec) => ({ ...sec, exercises: sec.exercises.map(addFact) })),
};

export const VideoWithFact: Story = {
  args: { review: withVideoFact },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: /Смотреть с комментариями/ });
    await expect(link).toHaveTextContent(/Подход 4 · 85\sкг × 7/);
    await expect(link).toHaveTextContent(/план 80\sкг × 5/);
    await expect(link).not.toHaveTextContent('undefined');
  },
};

export const Reply: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const field = c.getByRole('textbox', { name: 'Ответ тренеру по упражнению «Приседания со штангой»' });
    await userEvent.type(field, 'Спасибо, учту');
    await userEvent.click(c.getAllByRole('button', { name: 'Отправить' })[0]!);
    await waitFor(() => expect(args.onReply).toHaveBeenCalledTimes(1));
    await expect(args.onReply).toHaveBeenCalledWith(expect.objectContaining({ slug: 'squat' }), 'Спасибо, учту');
  },
};

export const ReplyFails: Story = {
  beforeEach: () => {
    onReply.mockReset().mockRejectedValue(new Error('Нет связи с сервером'));
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: /Приседания/ }), 'Привет');
    await userEvent.click(c.getAllByRole('button', { name: 'Отправить' })[0]!);
    await expect(await c.findByText('Нет связи с сервером')).toBeVisible();
  },
};

export const NotReviewedYet: Story = {
  args: { review: reviewPendingFixture },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Тренер ещё не разобрал тренировку')).toBeVisible();
    await expect(c.getAllByText('Без комментариев тренера')).toHaveLength(3);
  },
};

export const FoldedWarmupCooldown: Story = {
  args: { review: reviewFoldedFixture },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const warm = c.getByText('Разминка · 3');
    const cool = c.getByText('Заминка · 2');
    await expect(warm).toBeVisible();
    await expect(cool).toBeVisible();
    await expect(warm.closest('details')).not.toHaveAttribute('open');
    await expect(c.getByText('Кошка-корова')).not.toBeVisible();
    await expect(c.getByText('Растяжка бедра')).not.toBeVisible();
    await expect(c.getByRole('heading', { name: 'Приседания со штангой' })).toBeVisible();
    await userEvent.click(warm);
    await expect(c.getByText('Кошка-корова')).toBeVisible();
    await expect(c.getByText('Растяжка бедра')).not.toBeVisible();
    await userEvent.click(cool);
    await expect(c.getByText('Растяжка бедра')).toBeVisible();
  },
};

export const FoldedWithComment: Story = {
  args: { review: reviewFoldedCommentFixture },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const warm = c.getByText('Разминка · 3 · 1 новый');
    await expect(warm.closest('details')).toHaveAttribute('open');
    await expect(c.getByText('В разминке не торопись.')).toBeVisible();
    await expect(c.getByText('Заминка · 2').closest('details')).not.toHaveAttribute('open');
  },
};

export const Desktop: Story = {
  args: { layout: 'desktop' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Подсказки от тренера' })).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};
