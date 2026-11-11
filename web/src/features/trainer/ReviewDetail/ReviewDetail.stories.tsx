import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import sample from '../../../ui/VideoPlayer/sample.webm';
import { reviewFixture, reviewFoldedFixture, reviewPendingFixture } from '../../review/fixtures';
import { pastCommentsFixture, TODAY } from '../fixtures';
import { ReviewDetail } from './ReviewDetail';

const V = '11111111-1111-4111-8111-111111111111';
const onComment = fn();
const onDeleteComment = fn();
const onMarkReviewed = fn();

const meta = {
  title: 'Features/Trainer/ReviewDetail',
  component: ReviewDetail,
  args: {
    today: TODAY,
    athleteName: 'Никита',
    review: reviewFixture,
    past: pastCommentsFixture,
    videoSrc: () => sample,
    onComment,
    onDeleteComment,
    onMarkReviewed,
  },
  beforeEach: () => {
    onComment.mockReset().mockResolvedValue(undefined);
    onDeleteComment.mockReset().mockResolvedValue(undefined);
    onMarkReviewed.mockReset().mockResolvedValue(undefined);
  },
  parameters: { layout: 'padded', docs: { description: { component: 'Выполненная тренировка глазами тренера: подходы, видео раскрывающейся панелью, переписка, прошлые комментарии, «Отметить тренировку разобранной».' } } },
} satisfies Meta<typeof ReviewDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Reviewed: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Ноги и ягодицы' })).toBeVisible();
    await expect(c.getAllByText('Разобрано').length).toBeGreaterThan(0);
    await expect(c.queryByRole('button', { name: 'Отметить тренировку разобранной' })).toBeNull();
    await expect(c.getByText('Хорошо')).toBeVisible();
    await expect(c.getByText('Колено после третьего подхода ныло, но терпимо.')).toBeVisible();
    await expect(c.getByText('Ученик написал')).toBeVisible();
    await expect(c.getByText('Понял, попробую с паузой внизу на разминочных.')).toBeVisible();
    await expect(c.getByText('Прошлые комментарии')).toBeVisible();
    await expect(c.getByText('Тренировка разобрана')).toBeVisible();
  },
};

export const NotReviewedYet: Story = {
  args: { review: reviewPendingFixture },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Отметить тренировку разобранной' }));
    await waitFor(() => expect(onMarkReviewed).toHaveBeenCalledTimes(1));
  },
};

export const OldSessionWithoutFeedback: Story = {
  args: { review: { ...reviewPendingFixture, feeling: null, feelingLabel: null, feedbackComment: null } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(c.queryByText('Самочувствие')).toBeNull();
    await expect(c.queryByLabelText('Обратная связь спортсмена')).toBeNull();
  },
};

export const MarkFails: Story = {
  args: { review: reviewPendingFixture },
  beforeEach: () => {
    onMarkReviewed.mockReset().mockRejectedValue(new Error('Нет связи с сервером'));
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Отметить тренировку разобранной' }));
    await expect(await c.findByRole('alert')).toHaveTextContent('Нет связи с сервером');
  },
};

export const CommentToExercise: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: 'Ваш комментарий к упражнению «Румынская тяга»' }), 'На следующей 52,5 кг');
    await userEvent.click(c.getAllByRole('button', { name: 'Отправить' })[1]!);
    await waitFor(() => expect(onComment).toHaveBeenCalledTimes(1));
    await expect(onComment).toHaveBeenCalledWith({ text: 'На следующей 52,5 кг', sessionId: 7, exerciseId: 'rdl' });
  },
};

export const CommentToWorkout: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: 'Комментарий ко всей тренировке' }), 'Хорошая неделя');
    await userEvent.click(c.getAllByRole('button', { name: 'Отправить' }).at(-1)!);
    await waitFor(() => expect(onComment).toHaveBeenCalledWith({ text: 'Хорошая неделя', sessionId: 7 }));
  },
};

export const CommentFails: Story = {
  beforeEach: () => {
    onComment.mockReset().mockRejectedValue(new Error('Нет связи с сервером'));
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: /Румынская тяга/ }), 'Привет');
    await userEvent.click(c.getAllByRole('button', { name: 'Отправить' })[1]!);
    await expect(await c.findByText('Нет связи с сервером')).toBeVisible();
  },
};

/** Видео раскрывается рядом с шагом; комментарий можно привязать к моменту */
export const VideoPanel: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const open = c.getByRole('button', { name: /Видео, подход 4/ });
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(open);
    const hide = await c.findByRole('button', { name: 'Скрыть видео' });
    await expect(hide).toHaveAttribute('aria-expanded', 'true');
    await expect(c.getByRole('button', { name: /К моменту/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(c.getByRole('textbox', { name: /Приседания со штангой/ }), 'Хорошо');
    await userEvent.click(c.getAllByRole('button', { name: 'Отправить' })[0]!);
    await waitFor(() => expect(onComment).toHaveBeenCalledWith({ text: 'Хорошо', videoId: V, timecodeSec: 0 }));
    await userEvent.click(hide);
    await expect(c.queryByRole('button', { name: 'Скрыть видео' })).toBeNull();
  },
};

/** Свой комментарий удаляется в два нажатия; комментарий ученика без кнопки */
export const DeleteOwnComment: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const first = c.getAllByRole('button', { name: 'Удалить' })[0]!;
    await userEvent.click(first);
    await expect(onDeleteComment).not.toHaveBeenCalled();
    await userEvent.click(await c.findByRole('button', { name: 'Точно удалить' }));
    await waitFor(() => expect(onDeleteComment).toHaveBeenCalledTimes(1));
  },
};

/** Таймкод в переписке открывает панель видео на этом моменте */
export const SeekFromComment: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getAllByRole('button', { name: 'Перейти к 0:21' })[0]!);
    await expect(await c.findByRole('button', { name: 'Скрыть видео' })).toBeVisible();
  },
};

export const Touch44: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const el of [...c.getAllByRole('button'), ...c.getAllByRole('textbox')]) {
      await expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

export const FoldedWarmupCooldown: Story = {
  args: { review: reviewFoldedFixture },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const warm = c.getByText('Разминка · 3');
    await expect(warm.closest('details')).not.toHaveAttribute('open');
    await expect(c.getByText('Кошка-корова')).not.toBeVisible();
    await expect(c.getByText('Приседания со штангой')).toBeVisible();
    await userEvent.click(warm);
    await expect(c.getByText('Кошка-корова')).toBeVisible();
    await expect(c.getByText('Растяжка бедра')).not.toBeVisible();
  },
};
