import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { AwaitingCard } from './AwaitingCard';

const meta = {
  title: 'Features/Today/AwaitingCard',
  component: AwaitingCard,
  args: { awaiting: { sessionId: 7, title: 'Всё тело', whenLabel: 'вчера', videos: 2 } },
  parameters: { docs: { description: { component: 'Строка на «Сегодня»: видео отправлены, тренер ещё не посмотрел. Артборд «Ученик · Сегодня».' } } },
} satisfies Meta<typeof AwaitingCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/2 видео отправлены, тренер ещё не посмотрел/)).toBeVisible();
  },
};
export const OneVideo: Story = { args: { awaiting: { sessionId: 7, title: 'Верх тела', whenLabel: '31 окт', videos: 1 } } };
