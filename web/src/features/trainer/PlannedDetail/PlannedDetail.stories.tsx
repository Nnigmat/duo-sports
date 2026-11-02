import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { libraryFixture, plannedWorkoutFixture, sessionsFixture, TODAY } from '../fixtures';
import { PlannedDetail } from './PlannedDetail';

const onHint = fn();

const meta = {
  title: 'Features/Trainer/PlannedDetail',
  component: PlannedDetail,
  args: {
    today: TODAY,
    item: sessionsFixture.planned[0]!,
    workout: plannedWorkoutFixture,
    library: libraryFixture,
    onHint,
  },
  beforeEach: () => {
    onHint.mockReset().mockResolvedValue(undefined);
  },
  parameters: { layout: 'padded', docs: { description: { component: 'Запланированная тренировка: состав и «Подсказка перед тренировкой». Упражнениям без slug в библиотеке поля подсказки не даём.' } } },
} satisfies Meta<typeof PlannedDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Верх тела' })).toBeVisible();
    await expect(c.getByText('Сегодня')).toBeVisible();
    await expect(c.getByText(/Тренировка ещё не выполнена/)).toBeVisible();
    await expect(c.getAllByRole('textbox')).toHaveLength(2);
    await expect(c.queryByRole('textbox', { name: /Круг/ })).toBeNull();
  },
};

export const SaveHint: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: 'Подсказка перед тренировкой: Жим лёжа' }), 'Сведи лопатки');
    await userEvent.click(c.getAllByRole('button', { name: 'Сохранить подсказку' })[0]!);
    await waitFor(() => expect(onHint).toHaveBeenCalledWith(11, 'bench', 'Сведи лопатки'));
    await expect(await c.findByRole('status')).toHaveTextContent('Подсказка сохранена');
  },
};

export const SaveFails: Story = {
  beforeEach: () => {
    onHint.mockReset().mockRejectedValue(new Error('Нет связи с сервером'));
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: /Жим лёжа/ }), 'Привет');
    await userEvent.click(c.getAllByRole('button', { name: 'Сохранить подсказку' })[0]!);
    await expect(await c.findByText('Нет связи с сервером')).toBeVisible();
  },
};

export const EmptyHintDisabled: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('button', { name: 'Сохранить подсказку' })[0]).toBeDisabled();
  },
};

export const MovedHere: Story = {
  args: { item: sessionsFixture.planned[3]! },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Перенесена с ср, 4 ноября')).toBeVisible();
  },
};

export const NoStructure: Story = {
  args: { workout: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Состав тренировки недоступен.')).toBeVisible();
  },
};

export const Touch44: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const el of [...c.getAllByRole('button'), ...c.getAllByRole('textbox')]) {
      await expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};
