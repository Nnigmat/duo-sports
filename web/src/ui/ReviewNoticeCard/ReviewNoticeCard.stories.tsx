import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { ReviewNoticeCard } from './ReviewNoticeCard';

const now = new Date(2026, 10, 2, 12, 0);

const meta = {
  title: 'UI/ReviewNoticeCard',
  component: ReviewNoticeCard,
  args: {
    now,
    href: '#review',
    onDismiss: fn(),
    notice: {
      notificationId: 1,
      sessionId: 7,
      title: 'Ноги и ягодицы',
      reviewedAt: new Date(2026, 10, 1, 19, 40).toISOString(),
      commentCount: 4,
      videoCommentCount: 3,
      preview: { exerciseName: 'Приседания со штангой', timecodeSec: 21, text: 'На 4-м повторе колени уходят внутрь. Думай «раздвинуть пол» стопами.' },
    },
  },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `Карточка разбора на «Сегодня». Роутер снаружи: ссылка получает href и onLinkClick. ${ARTIFACT}` } } },
} satisfies Meta<typeof ReviewNoticeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Новый разбор · вчера в 19:40')).toBeInTheDocument();
    await expect(c.getByText('4 комментария · 3 к видео')).toBeInTheDocument();
    await expect(c.getByRole('link', { name: 'Посмотреть разбор' })).toHaveAttribute('href', '#review');
    const hide = c.getByRole('button', { name: 'Скрыть' });
    await expect(hide.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.click(hide);
    await expect(args.onDismiss).toHaveBeenCalled();
  },
};
export const NoVideo: Story = {
  args: { notice: { ...meta.args.notice, commentCount: 1, videoCommentCount: 0, preview: { exerciseName: 'Жим лёжа', timecodeSec: null, text: 'Хороший темп, держи лопатки сведёнными.' } } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('1 комментарий')).toBeInTheDocument();
  },
};
export const NoPreview: Story = { args: { notice: { ...meta.args.notice, preview: null } } };
export const LongText: Story = {
  args: { notice: { ...meta.args.notice, title: 'Очень длинное название тренировки для проверки переноса строк', preview: { exerciseName: 'Приседания со штангой на плечах', timecodeSec: 125, text: 'Очень длинный комментарий тренера. '.repeat(10) } } },
};
export const CustomLinkLabel: Story = { args: { children: 'Открыть разбор' } };
