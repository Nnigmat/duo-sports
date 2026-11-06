import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FeedbackScreen } from './FeedbackScreen';

const onSend = fn();
const onBack = fn();

const meta = {
  title: 'Features/Workout/FeedbackScreen',
  component: FeedbackScreen,
  args: { onSend, onBack },
  beforeEach: () => {
    onSend.mockReset();
    onBack.mockReset();
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: { description: { component: 'Экран «Обратная связь». Пока заглушка до оценки самочувствия.' } },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof FeedbackScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Обратная связь' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'К итогам' }));
    await expect(onBack).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Отправить' }));
    await expect(onSend).toHaveBeenCalledTimes(1);
  },
};
