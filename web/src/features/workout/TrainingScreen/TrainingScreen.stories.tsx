import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ARTIFACT } from '../../../ui/storyKit';
import sample from '../parts/DemoVideo/sample.mp4';
import { TrainingScreen } from './TrainingScreen';

const handlers = {
  onBack: fn(),
  onExit: fn(),
  onTech: fn(),
  onRecord: fn(),
  onOpenNotes: fn(),
};
const barHandlers = { onDone: fn(), onEdit: fn(), onSkip: fn(), onStart: fn(), onPauseToggle: fn(), onAddTime: fn() };

const NOTE = 'Локти назад, не разводи в стороны. Спину держи ближе к лавочке.';

const meta = {
  title: 'Features/Workout/TrainingScreen',
  component: TrainingScreen,
  args: {
    blockLabel: 'Круг 1 из 3',
    progress: { count: 9, current: 0 },
    eyebrow: 'Подход 1 из 9',
    line: 'Обратные отжимания · 18–20 повт',
    pose: 'dips',
    note: NOTE,
    bar: { mode: 'set', onDone: barHandlers.onDone, onEdit: barHandlers.onEdit, onSkip: barHandlers.onSkip },
    ...handlers,
  },
  parameters: {
    layout: 'fullscreen',
    bleed: true,
    docs: {
      description: {
        component: `Экран тренировки: шапка, полоска прогресса, облачко, чибик с кнопками «Техника» и «Запись», карточка тренера и нижний ряд. Артборды «Подход», «Отдых», «Разминка», «Старт». ${ARTIFACT}`,
      },
    },
  },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof TrainingScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Подход на повторы с комментарием тренера */
export const SetReps: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Готово' }));
    await userEvent.click(c.getByRole('button', { name: 'Техника' }));
    await userEvent.click(c.getByRole('button', { name: /комментарий тренера/i }));
    await userEvent.click(c.getByRole('button', { name: 'Шаг назад' }));
    await userEvent.click(c.getByRole('button', { name: 'Закончить тренировку' }));
    await expect(barHandlers.onDone).toHaveBeenCalledTimes(1);
    await expect(handlers.onTech).toHaveBeenCalledTimes(1);
    await expect(handlers.onOpenNotes).toHaveBeenCalledTimes(1);
    await expect(handlers.onBack).toHaveBeenCalledTimes(1);
    await expect(handlers.onExit).toHaveBeenCalledTimes(1);
    await expect(c.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    // Нижний ряд закреплён: экран не выше окна, кнопка «Готово» целиком в окне
    // (документ не меряем: декоратор Storybook добавляет вокруг историй отступ)
    const screen = c.getByRole('progressbar').parentElement as HTMLElement;
    await expect(screen.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight);
    await expect(c.getByRole('button', { name: 'Готово' }).getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
  },
};

export const SetWithoutNote: Story = {
  args: { note: undefined, techNew: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole('button', { name: /комментарий тренера, открыть/i })).toBeNull();
    await expect(c.getByRole('button', { name: 'Техника, новый комментарий тренера' })).toBeVisible();
  },
};

export const SetWeight: Story = {
  args: {
    blockLabel: 'Подходами',
    progress: { count: 3, current: 0 },
    eyebrow: 'Подход 1 из 3',
    line: 'Приседания · 12 кг × 12',
    pose: 'squat',
  },
};

/** Круг с видеозаписью: чибик держит камеру */
export const SetWithCamera: Story = {
  args: {
    blockLabel: 'Круг 2 из 3',
    progress: { count: 9, current: 3 },
    eyebrow: 'Подход 4 из 9',
    pose: 'camera',
    recordable: true,
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Нажмите на камеру, чтобы снять подход')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Начать запись' }));
    await expect(handlers.onRecord).toHaveBeenCalledTimes(1);
  },
};

/** Ролик чибика вместо статичного */
export const SetWithDemo: Story = {
  args: { demoUrl: sample },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(canvasElement.querySelector('video')).not.toBeNull();
    await expect(c.queryByRole('img')).toBeNull();
    await expect(c.getByRole('button', { name: 'Техника' })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Готово' })).toBeVisible();
  },
};

/** Файл ролика не загрузился: возвращается статичный чибик */
export const DemoFailed: Story = {
  args: { demoUrl: '/net-takogo-rolika.mp4' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole('img')).toBeVisible());
    await expect(canvasElement.querySelector('video')).toBeNull();
  },
};

export const Rest: Story = {
  args: {
    pose: 'rest',
    bar: { mode: 'rest', seconds: 60, total: 60, onAddTime: barHandlers.onAddTime, onSkip: barHandlers.onSkip },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('timer')).toHaveAccessibleName('отдых 01:00');
    await userEvent.click(c.getByRole('button', { name: 'Добавить 15 секунд' }));
    await expect(barHandlers.onAddTime).toHaveBeenCalledTimes(1);
  },
};

/** Разминка по таймеру */
export const Timer: Story = {
  args: {
    blockLabel: 'Разминка',
    progress: { count: 6, current: 0 },
    eyebrow: 'Упражнение 1 из 6',
    line: 'Вращения головой · 00:30',
    pose: 'headroll',
    note: undefined,
    bar: { mode: 'timer', seconds: 18, total: 30, onPauseToggle: barHandlers.onPauseToggle, onSkip: barHandlers.onSkip },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Пауза, 00:18 осталось' }));
    await expect(barHandlers.onPauseToggle).toHaveBeenCalledTimes(1);
  },
};

export const TimerPaused: Story = {
  args: {
    ...Timer.args,
    bar: { mode: 'timer', paused: true, seconds: 18, total: 30, onPauseToggle: barHandlers.onPauseToggle, onSkip: barHandlers.onSkip },
  },
};

/** Время перед стартом: упражнение на время ждёт нажатия */
export const Start: Story = {
  args: {
    blockLabel: 'Подходами',
    progress: { count: 2, current: 0 },
    eyebrow: 'Подход 1 из 2',
    line: 'Планка · 00:45–01:00',
    pose: 'plank',
    bar: { mode: 'start', onStart: barHandlers.onStart, onEdit: barHandlers.onEdit, onSkip: barHandlers.onSkip },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Старт' }));
    await expect(barHandlers.onStart).toHaveBeenCalledTimes(1);
  },
};
