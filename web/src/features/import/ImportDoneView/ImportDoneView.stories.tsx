import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { newExercisesFixture, planSourceFixture } from '../fixtures';
import { buildPlan, DEFAULT_OPTIONS } from '../importPlan';
import { EMPTY_CHOICES } from '../preview';
import { ImportDoneView } from './ImportDoneView';

const meta = {
  title: 'Features/Import/ImportDoneView',
  component: ImportDoneView,
  args: {
    time: '14:20',
    plan: buildPlan(planSourceFixture, DEFAULT_OPTIONS),
    newExercises: newExercisesFixture,
    choices: EMPTY_CHOICES,
    total: 26,
    restored: ['Всё тело', 'Верх тела A'],
    undone: false,
    onUndo: fn(),
    onRedo: fn(),
    workoutsHref: '/',
    planHref: '/plan',
    exercisesHref: '/exercises',
    againHref: '/import',
  },
  // Отмена и возврат переключают состояние, как в контейнере
  render: (args) => {
    const [undone, setUndone] = useState(args.undone);
    return <ImportDoneView {...args} undone={undone} onUndo={() => { setUndone(true); args.onUndo(); }} onRedo={() => { setUndone(false); args.onRedo(); }} />;
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Артборд «Импорт · 4 Готово»: итоги, новые упражнения, замечания и отмена. После отмены — «Всё как было» и «Вернуть импорт».' } } },
} satisfies Meta<typeof ImportDoneView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Done: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт завершён' })).toBeVisible();
    await expect(c.getByText('Сегодня в 14:20')).toBeVisible();
    await expect(within(c.getByRole('list', { name: 'Итоги импорта' })).getAllByRole('listitem')).toHaveLength(4);
    await expect(c.getByRole('link', { name: 'Открыть план' })).toHaveAttribute('href', '/plan');
    await expect(c.getByRole('heading', { level: 2, name: 'Обратите внимание' })).toBeVisible();
    await expect(c.getByText(/Отменить можно в течение 24 часов/)).toBeVisible();
  },
};

export const UndoAndRedo: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Отменить импорт' }));
    await expect(args.onUndo).toHaveBeenCalled();
    await expect(c.getByRole('heading', { level: 1, name: 'Всё как было' })).toBeVisible();
    await expect(c.getByText('Удалено 26 тренировок и 31 упражнение, «Всё тело» и «Верх тела A» вернулись в план.')).toBeVisible();
    await expect(c.getByRole('link', { name: 'Вставить снова' })).toHaveAttribute('href', '/import');
    await expect(c.queryByRole('link', { name: 'Открыть план' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Вернуть импорт' }));
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт завершён' })).toBeVisible();
  },
};

export const Undone: Story = { args: { undone: true } };

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
