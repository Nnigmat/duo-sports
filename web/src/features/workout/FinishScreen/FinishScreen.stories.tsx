import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../../../ui/storyKit';
import { FinishScreen } from './FinishScreen';

const onFinish = fn();
const onClose = fn();

const meta = {
  title: 'Features/Workout/FinishScreen',
  component: FinishScreen,
  args: {
    stats: { setsDone: 9, setsTotal: 9, rounds: 3, videos: 3 },
    onFinish,
    onClose,
  },
  beforeEach: () => {
    onFinish.mockReset();
    onClose.mockReset();
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: {
      description: {
        component: `Экран финиша: радующийся чибик, итоги (подходы, круги, видео) и «Завершить». Артборд «Тренировка завершена». ${ARTIFACT}`,
      },
    },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof FinishScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Тренировка пройдена')).toBeVisible();
    await expect(c.getByText('9 из 9')).toBeVisible();
    await expect(c.getByText('видео записано')).toBeVisible();
    await expect(c.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '9');
    await expect(c.queryByRole('button', { name: 'Шаг назад' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Завершить' }));
    await expect(onFinish).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Закрыть' }));
    await expect(onClose).toHaveBeenCalledTimes(1);
  },
};

/** Часть подходов пропущена */
export const Partial: Story = {
  args: { stats: { setsDone: 7, setsTotal: 9, rounds: 3, videos: 2 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('7 из 9')).toBeVisible();
  },
};

/** Без круговых блоков и без видео показателей кругов и видео нет */
export const OnlyTotals: Story = {
  args: { stats: { setsDone: 5, setsTotal: 5, rounds: 0, videos: 0 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('5 из 5')).toBeVisible();
    await expect(c.queryByText('видео записано')).toBeNull();
  },
};
