import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { measurementsFixture } from '../../../data/fixtures';
import { ARTIFACT } from '../../../ui/storyKit';
import { MeasureFormView } from './MeasureFormView';

const meta = {
  title: 'Features/Measurements/MeasureFormView',
  component: MeasureFormView,
  args: {
    today: '2026-11-14',
    entries: measurementsFixture.entries,
    saving: false,
    onBack: fn(),
    onSave: fn(),
  },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: `Экран ввода замера. Артборд «06 · Замеры». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof MeasureFormView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const save = c.getByRole('button', { name: 'Сохранить' });
    await expect(save).toBeDisabled();
    await expect(c.getByText('Суббота, 14 ноября')).toBeVisible();
    await expect(c.getByText('Серым — прошлый замер, 31 октября. Пустые поля можно пропустить.')).toBeVisible();

    await userEvent.type(c.getByLabelText('Вес'), '72');
    const save1 = c.getByRole('button', { name: 'Сохранить · 1 из 7' });
    await expect(save1).toBeEnabled();
    await expect(c.getByText('было 72,4 → −0,4')).toBeVisible();

    await userEvent.click(save1);
    await expect(args.onSave).toHaveBeenCalledTimes(1);
    await expect(args.onSave).toHaveBeenCalledWith({ date: '2026-11-14', values: { weight: 72 } });
  },
};

export const HintFollowsFocus: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const live = c.getByRole('status');
    await expect(live).toHaveTextContent('Как мерить');
    await userEvent.click(c.getByLabelText('Грудь'));
    await expect(live).toHaveTextContent('Грудь');
    await expect(live).toHaveTextContent('По самой выступающей точке, лента под мышками. На спокойном выдохе.');
  },
};

export const SkipsEmptyAndInvalid: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Вес'), '72,5');
    await userEvent.type(c.getByLabelText('Талия'), ',');
    await userEvent.type(c.getByLabelText('Рука'), '31.5');
    await expect(c.getByRole('button', { name: 'Сохранить · 2 из 7' })).toBeEnabled();
    await userEvent.click(c.getByRole('button', { name: /Сохранить/ }));
    await expect(args.onSave).toHaveBeenCalledWith({ date: '2026-11-14', values: { weight: 72.5, arm: 31.5 } });
  },
};

export const Back: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Назад' }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};

export const Empty: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Пустые поля можно пропустить.')).toBeVisible();
    await expect(c.getAllByText('первый замер')).toHaveLength(7);
  },
};

export const Saving: Story = {
  args: { saving: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: /Сохранить/ })).toBeDisabled();
  },
};

export const WithError: Story = {
  args: { error: 'Не удалось сохранить. Проверьте сеть и повторите.' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Не удалось сохранить');
  },
};
