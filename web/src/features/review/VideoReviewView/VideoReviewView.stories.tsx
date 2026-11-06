import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import sample from '../../../ui/VideoPlayer/sample.webm';
import { reviewFixture } from '../fixtures';
import { VideoReviewView } from './VideoReviewView';

const V = '11111111-1111-4111-8111-111111111111';
const onReply = fn();

const meta = {
  title: 'Features/Review/VideoReviewView',
  component: VideoReviewView,
  args: {
    video: { id: V, durationSec: 12, exerciseName: 'Приседания со штангой', label: 'Подход 4 · 80 кг × 5', sessionId: 7 },
    comments: reviewFixture.exercises[0]!.thread.map((c) => ({ ...c, timecodeSec: c.timecodeSec === null ? null : c.timecodeSec / 4 })),
    src: sample,
    onBack: fn(),
    onReply,
  },
  beforeEach: () => {
    onReply.mockReset().mockResolvedValue(undefined);
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Видео ученика с комментариями тренера. Артборд «Ученик · Видео с комментариями».' } } },
} satisfies Meta<typeof VideoReviewView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Комментарии тренера · 3' })).toBeVisible();
    await expect(c.getByText('Понял, попробую с паузой внизу на разминочных.')).toBeVisible();
  },
};

export const OpenedAtComment: Story = { args: { startSec: 5 } };

export const ReplyAtMoment: Story = {
  args: { startSec: 3 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: /К моменту/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(c.getByRole('textbox', { name: 'Ответ тренеру' }), 'Спасибо');
    await userEvent.click(c.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(onReply).toHaveBeenCalledTimes(1));
    await expect(onReply.mock.calls[0]![1]).toEqual(expect.any(Number));
  },
};

export const ReplyWithoutMoment: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /К моменту/ }));
    await userEvent.type(c.getByRole('textbox', { name: 'Ответ тренеру' }), 'Понял');
    await userEvent.click(c.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(onReply).toHaveBeenCalledWith('Понял', null));
  },
};

export const NoComments: Story = {
  args: { comments: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('К этому видео пока нет комментариев')).toBeVisible();
  },
};

export const NoVideoFile: Story = { args: { src: undefined } };
