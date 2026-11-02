import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { Comment } from './Comment';

const meta = {
  title: 'UI/Comment',
  component: Comment,
  args: { author: 'Тренер', text: 'На 4-м повторе колени уходят внутрь. Думай «раздвинуть пол» стопами.', timecodeSec: 21, onSeek: fn() },
  decorators: [(Story) => <ul style={{ maxWidth: 358, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><Story /></ul>],
  parameters: { docs: { description: { component: `Комментарий тренера или ответ ученика; таймкод ведёт к моменту видео. Рисуется как <li>. ${ARTIFACT}` } } },
} satisfies Meta<typeof Comment>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTimecode: Story = {
  play: async ({ canvasElement, args }) => {
    const btn = within(canvasElement).getByRole('button', { name: 'Перейти к 0:21' });
    await expect(btn.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.click(btn);
    await expect(args.onSeek).toHaveBeenCalledWith(21);
  },
};
export const NoTimecode: Story = {
  args: { timecodeSec: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};
export const New: Story = {
  args: { isNew: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('новое')).toBeInTheDocument();
  },
};
export const Reply: Story = { args: { author: 'Ты', reply: true, timecodeSec: null, text: 'Понял, попробую с паузой внизу.' } };
export const Active: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('listitem')).toHaveAttribute('aria-current', 'true');
  },
};
export const AsLink: Story = { args: { timecodeHref: '#video' } };
export const LongText: Story = {
  args: { text: 'Очень длинный комментарий. '.repeat(12) + 'Нерзрывнаяпоследовательностьбезпробеловдлявпроверкипереноса'.repeat(2) },
};
