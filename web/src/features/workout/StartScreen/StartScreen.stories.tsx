import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../../../ui/storyKit';
import { StartScreen } from './StartScreen';
import { CIRCUIT, COOLDOWN, STRENGTH, WARMUP } from './storyData';

const onBack = fn();
const onStart = fn();

const meta = {
  title: 'Features/Workout/StartScreen',
  component: StartScreen,
  args: {
    title: 'Круговая тренировка',
    dateLabel: 'Пятница, 30 октября',
    blocks: [WARMUP, CIRCUIT, COOLDOWN],
    onBack,
    onStart,
  },
  beforeEach: () => {
    onBack.mockReset();
    onStart.mockReset();
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: {
      description: {
        component: `Экран старта: название, что в блоках (разминка, круги, заминка) и «Начать тренировку». Артборд «Старт тренировки». ${ARTIFACT}`,
      },
    },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof StartScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Круговая тренировка' })).toBeVisible();
    await expect(c.getByText('3 круга · 9 подходов')).toBeVisible();
    await expect(c.getByText('6 упражнений по 30 с')).toBeVisible();
    await expect(c.getByText('Круг 2 записываем на видео')).toBeVisible();
    await expect(c.getByText('Отдых 60 с после каждого подхода')).toBeVisible();
    await expect(c.getAllByRole('listitem').length).toBeGreaterThan(5);
    await userEvent.click(c.getByRole('button', { name: 'Начать тренировку' }));
    await expect(onStart).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Шаг назад' }));
    await expect(onBack).toHaveBeenCalledTimes(1);
  },
};

/** Блок «подходами»: у каждого упражнения своё число подходов, видео у нескольких */
export const SetsBlock: Story = {
  args: { title: 'Силовая', blocks: [STRENGTH] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('3 × 12 кг × 12')).toBeVisible();
    await expect(c.getByText('2 × 00:45–01:00')).toBeVisible();
    await expect(c.getByText('Отдых 90 с между подходами')).toBeVisible();
    await expect(c.getByText('Подходы 2 и 3 записываем на видео')).toBeVisible();
  },
};

/** Список «Что взять»: инвентарь упражнений с весом там, где он нужен */
export const WithGear: Story = {
  args: { title: 'Силовая', blocks: [STRENGTH], equipment: { [STRENGTH.exercises[0]!.id]: ['2 гантели', 'Скамья'] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('list', { name: 'Что взять' })).toBeVisible();
    await expect(c.getByText('2 гантели 12 кг')).toBeVisible();
    await expect(c.getByText('Скамья')).toBeVisible();
  },
};

export const WarmupOnly: Story = {
  args: { title: 'Разминка', blocks: [WARMUP] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('6 упражнений')).toBeVisible();
  },
};
