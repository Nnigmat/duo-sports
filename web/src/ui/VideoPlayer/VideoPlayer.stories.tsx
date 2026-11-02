import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer';
import sample from './sample.webm';

const comments = [
  { id: 'a', timecodeSec: 2, text: 'Глубина отличная, бедро ниже параллели.', author: 'Тренер' },
  { id: 'b', timecodeSec: 6, text: 'Колени уходят внутрь. Думай «раздвинуть пол» стопами.', author: 'Тренер' },
  { id: 'c', timecodeSec: 10, text: 'Понял, попробую с паузой.', author: 'Ты' },
];

const meta = {
  title: 'UI/VideoPlayer',
  component: VideoPlayer,
  args: {
    src: sample,
    durationSec: 12,
    comments,
    title: 'Приседания со штангой',
    subtitle: 'Подход 4 · 80 кг × 5',
    onCommentSelect: fn(),
    onPlayingChange: fn(),
  },
  decorators: [(Story) => <div style={{ width: 390 }}><Story /></div>],
  parameters: {
    docs: {
      description: {
        component: `Нативный <video> без зависимостей. Образец — крошечный файл sample.webm (12 с, 1 КБ). Логика времени и комментариев в player.ts. ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof VideoPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('0:00', { selector: 'span' })).toBeInTheDocument();
    await expect(c.getByText('– из 3')).toBeInTheDocument();
    // перейти к комментарию меткой
    await userEvent.click(c.getByRole('button', { name: 'Тренер, комментарий на 0:06' }));
    await expect(args.onCommentSelect).toHaveBeenCalledWith('b');
    await waitFor(() => expect(c.getByText(/раздвинуть пол/)).toBeVisible());
    await expect(c.getByText('2 из 3')).toBeInTheDocument();
    // следующий / предыдущий
    await userEvent.click(c.getByRole('button', { name: 'Следующий комментарий' }));
    await waitFor(() => expect(c.getByText('3 из 3')).toBeInTheDocument());
    await expect(c.getByRole('button', { name: 'Следующий комментарий' })).toBeDisabled();
    await userEvent.click(c.getByRole('button', { name: 'Предыдущий комментарий' }));
    await waitFor(() => expect(c.getByText('2 из 3')).toBeInTheDocument());
    // скорость по кругу
    const speed = c.getByRole('button', { name: /Скорость 1×/ });
    await userEvent.click(speed);
    await expect(c.getByRole('button', { name: /Скорость 0,5×/ })).toHaveTextContent('0,5×');
    await userEvent.click(c.getByRole('button', { name: /Скорость 0,5×/ }));
    await userEvent.click(c.getByRole('button', { name: /Скорость 0,25×/ }));
    await expect(c.getByRole('button', { name: /Скорость 1×/ })).toHaveTextContent('1×');
  },
};

export const SkipFiveSeconds: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '+5 с, вперёд' }));
    await waitFor(() => expect(c.getByRole('slider')).toHaveAttribute('aria-valuetext', '0:05 из 0:12'));
    await userEvent.click(c.getByRole('button', { name: '−5 с, назад' }));
    await waitFor(() => expect(c.getByRole('slider')).toHaveAttribute('aria-valuetext', '0:00 из 0:12'));
  },
};

export const PlayPause: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const v = canvasElement.querySelector('video')!;
    await waitFor(() => expect(v.readyState).toBeGreaterThan(0));
    // Автозапуск в тестовом браузере разрешён только без звука
    v.muted = true;
    await userEvent.click(c.getByRole('button', { name: 'Играть' }));
    await waitFor(() => expect(c.getByRole('button', { name: 'Пауза' })).toBeInTheDocument());
    await userEvent.click(c.getByRole('button', { name: 'Пауза' }));
    await waitFor(() => expect(c.getByRole('button', { name: 'Играть' })).toBeInTheDocument());
    await expect(args.onPlayingChange).toHaveBeenCalled();
  },
};

export const NoVideo: Story = {
  args: { src: undefined, durationSec: 38 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Видео не загружено')).toBeInTheDocument();
    await expect(c.getByRole('button', { name: 'Играть' })).toBeDisabled();
  },
};

export const NoComments: Story = {
  args: { comments: [] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('0 из 0')).toBeInTheDocument();
    await expect(c.getByRole('button', { name: 'Следующий комментарий' })).toBeDisabled();
  },
};

export const LongComment: Story = {
  args: { comments: [{ id: 'l', timecodeSec: 0, text: 'Очень длинный комментарий тренера про технику. '.repeat(5), author: 'Тренер' }] },
};

/** Внешний список комментариев управляет плеером через ref */
export const ExternalSeek: Story = {
  render: (args) => {
    const ref = useRef<VideoPlayerHandle>(null);
    const [t, setT] = useState(0);
    return (
      <div>
        <VideoPlayer {...args} ref={ref} onTimeChange={setT} />
        <button type="button" style={{ minHeight: 44 }} onClick={() => ref.current?.seek(10)}>
          К 0:10
        </button>
        <output>t={Math.floor(t)}</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'К 0:10' }));
    await waitFor(() => expect(c.getByText('t=10')).toBeInTheDocument());
    await waitFor(() => expect(c.getByText(/Понял, попробую/)).toBeVisible());
  },
};
