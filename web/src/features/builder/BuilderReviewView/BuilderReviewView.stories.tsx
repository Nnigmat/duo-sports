import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, userEvent, within } from 'storybook/test';
import { libraryExercises, reviewDraft, routines } from '../storyData';
import { BuilderReviewView } from './BuilderReviewView';

type Props = Parameters<typeof BuilderReviewView>[0];

function Stateful(props: Props) {
  const [draft, setDraft] = useState(props.draft);
  return (
    <BuilderReviewView
      {...props}
      draft={draft}
      onDraft={(d) => {
        setDraft(d);
        props.onDraft(d);
      }}
    />
  );
}

const meta = {
  title: 'Features/Builder/BuilderReviewView',
  component: BuilderReviewView,
  render: (args) => <Stateful {...args} />,
  globals: { viewport: { value: 'a15', isRotated: false } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    draft: reviewDraft,
    library: libraryExercises,
    routines,
    saving: false,
    problems: [],
    failure: null,
    onDraft: fn(),
    onSave: fn(),
    onRebuild: fn(),
    restoredAt: null,
    onReset: fn(),
  },
} satisfies Meta<typeof BuilderReviewView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithAdvice: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('В библиотеке есть похожее — Отжимания на брусьях')).toBeVisible();
    await expect(c.getByText('Разминка: Шея и плечи')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Заменить на „Отжимания на брусьях“' }));
    await expect(args.onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ newExercises: [], advice: [] }));
    await expect(c.queryByText('новое')).toBeNull();
  },
};

export const NewExercise: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('новое')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Открыть «Отжимания с хлопком»' }));
    const sheet = within(document.body);
    await expect(await sheet.findByLabelText('Название')).toHaveValue('Отжимания с хлопком');
    await expect(sheet.getByLabelText('Мышцы')).toHaveValue('грудь, трицепс');
    await expect(sheet.getByLabelText('Инвентарь')).toHaveValue('Коврик');
    await expect(sheet.getByLabelText('Техника')).toHaveValue('Корпус прямой, толчок резкий');
    await expect(sheet.getByLabelText('Повторы')).toBeChecked();
    await expect(sheet.getByRole('button', { name: 'Использовать похожее: Отжимания на брусьях' })).toBeVisible();
  },
};

export const NewWarmup: Story = {
  args: {
    draft: {
      ...reviewDraft,
      advice: [],
      cooldown: { kind: 'new', title: 'Растяжка после жима', items: [{ name: 'Вращение руками', sec: 30, sides: ['вправо', 'влево'] }, { name: 'Вращение руками', sec: 45 }] },
    },
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('новая заминка')).toBeVisible();
    await expect(c.getByLabelText('Название заминки')).toHaveValue('Растяжка после жима');
    await userEvent.click(c.getAllByRole('button', { name: 'Убрать «Вращение руками»' })[0]!);
    await expect(args.onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ cooldown: expect.objectContaining({ items: [{ name: 'Вращение руками', sec: 45 }] }) }));
  },
};

export const DropNewCooldown: Story = {
  args: {
    draft: { ...reviewDraft, advice: [], cooldown: { kind: 'new', title: 'Растяжка после жима', items: [{ name: 'Вращение руками', sec: 30 }] } },
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Убрать заминку' }));
    await expect(args.onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ cooldown: { kind: 'none' } }));
    await expect(c.queryByText('новая заминка')).toBeNull();
  },
};

export const NewExerciseInCooldown: Story = {
  args: {
    draft: {
      ...reviewDraft,
      advice: [],
      blocks: [{ id: 'b1', mode: 'sets', title: 'Подходами', restSec: 90, videoRounds: [], exercises: [{ id: 'x1', name: 'Жим лёжа', kind: 'weight', target: { min: 8, max: 8 }, weight: 60, sets: 4 }] }],
      newExercises: [{ name: 'Наклоны головы', slug: 'neck-roll', muscles: [], kind: 'time', equipment: [], notes: '', aliases: [] }],
      cooldown: { kind: 'new', title: 'Растяжка шеи', items: [{ name: 'Наклоны головы', sec: 30 }, { name: 'Вращение руками', sec: 30 }] },
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const card = within(c.getByLabelText('Новая заминка'));
    await expect(card.getByText('новое')).toBeVisible();
    await expect(card.queryByRole('button', { name: 'Открыть «Вращение руками»' })).toBeNull();
    await userEvent.click(card.getByRole('button', { name: 'Открыть «Наклоны головы»' }));
    await expect(await within(document.body).findByLabelText('Название')).toHaveValue('Наклоны головы');
  },
};

export const Restored: Story = {
  args: { restoredAt: new Date(2026, 10, 17, 21, 40).getTime() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Восстановлен черновик от 17 ноя, 21:40')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Начать заново' }));
    await expect(args.onReset).toHaveBeenCalled();
  },
};

export const Problems: Story = {
  args: { problems: ['У нового упражнения «Отжимания с хлопком» не указаны мышцы', 'Заминка «Растяжка спины» уже есть — дайте другое название'] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/не указаны мышцы/)).toBeVisible();
  },
};

export const SaveFailed: Story = {
  args: { failure: 'Сервер ответил 500' },
};

export const RebuildConfirm: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Пересобрать' }));
    await expect(c.getByText('Правки формы пропадут')).toBeVisible();
    await expect(args.onRebuild).not.toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Остаться' }));
    await expect(c.queryByText('Правки формы пропадут')).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Пересобрать' }));
    const confirm = c.getByRole('region', { name: 'Пересобрать тренировку' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Пересобрать' }));
    await expect(args.onRebuild).toHaveBeenCalled();
  },
};
