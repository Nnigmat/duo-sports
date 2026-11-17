import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { libraryEntries, routines } from '../storyData';
import { EMPTY_INPUT, type BuilderInput } from '../types';
import { BuilderInputView } from './BuilderInputView';

type Props = Parameters<typeof BuilderInputView>[0];

/** Ввод живёт в истории, чтобы выбор и текст менялись на экране */
function Stateful(props: Props) {
  const [input, setInput] = useState(props.input);
  return (
    <BuilderInputView
      {...props}
      input={input}
      onInput={(i) => {
        setInput(i);
        props.onInput(i);
      }}
    />
  );
}

const filled: BuilderInput = {
  title: '',
  warmup: { kind: 'library', slug: 'neck-shoulders' },
  main: { text: 'жим лёжа 4×8 60 кг, потом суперсет бицепс + трицепс, 3 круга', picked: ['bench-press'] },
  cooldown: { kind: 'text', text: 'растяжка спины 5 минут' },
};

const meta = {
  title: 'Features/Builder/BuilderInputView',
  component: BuilderInputView,
  render: (args) => <Stateful {...args} />,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: {
    dateLabel: 'вт 18 ноя',
    input: EMPTY_INPUT,
    library: libraryEntries,
    routines,
    building: false,
    error: null,
    unavailableHref: null,
    issues: [],
    restoredAt: null,
    onInput: fn(),
    onBuild: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof BuilderInputView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Новая тренировка');
    await expect(c.getByText('вт 18 ноя')).toBeVisible();
    await expect(c.getByRole('button', { name: 'Собрать тренировку' })).toBeDisabled();
  },
};

export const TextWarmup: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const warmup = c.getByRole('group', { name: 'Разминка' });
    await expect(within(warmup).queryByRole('textbox')).toBeNull();
    await userEvent.click(within(warmup).getByLabelText('Описать свою'));
    await userEvent.type(within(warmup).getByRole('textbox', { name: 'Какая разминка' }), 'суставная');
    await expect(args.onInput).toHaveBeenLastCalledWith(expect.objectContaining({ warmup: { kind: 'text', text: 'суставная' } }));
  },
};

export const PickFromLibrary: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Из библиотеки'), 'брусья');
    await userEvent.click(c.getByRole('button', { name: 'Отжимания на брусьях' }));
    await expect(args.onInput).toHaveBeenLastCalledWith(expect.objectContaining({ main: { text: '', picked: ['dips'] } }));
    await expect(c.getByRole('button', { name: 'Собрать тренировку' })).toBeEnabled();
    await userEvent.click(c.getByRole('button', { name: 'Убрать «Отжимания на брусьях»' }));
    await expect(c.getByRole('button', { name: 'Собрать тренировку' })).toBeDisabled();
  },
};

export const Restored: Story = {
  args: { input: filled, restoredAt: new Date(2026, 10, 17, 21, 40).getTime() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Восстановлен черновик от 17 ноя, 21:40')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Начать заново' }));
    await expect(args.onReset).toHaveBeenCalled();
  },
};

export const Building: Story = {
  args: { input: filled, building: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /Собрать тренировку/ });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};

export const ParseErrors: Story = {
  args: {
    input: filled,
    issues: [
      { message: 'Неизвестный exercise_id: bench-pres', hint: 'Исправьте опечатку или опишите упражнение в exercises.', line: 12 },
      { message: 'У упражнения нет нагрузки', line: 18 },
    ],
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Агент дважды собрал тренировку с ошибками/)).toBeVisible();
    await expect(c.getByText(/Неизвестный exercise_id: bench-pres/)).toBeVisible();
    await expect(c.getByRole('button', { name: 'Собрать тренировку' })).toBeEnabled();
  },
};

export const Unavailable: Story = {
  args: { input: filled, unavailableHref: '/import?date=2026-11-18' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Сборка недоступна/)).toBeVisible();
    await expect(c.getByRole('link', { name: 'Открыть импорт' })).toHaveAttribute('href', '/import?date=2026-11-18');
  },
};

export const NearLimit: Story = {
  args: { input: { ...EMPTY_INPUT, main: { text: 'а'.repeat(1950), picked: [] } } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('1950 / 2000')).toBeVisible();
  },
};
