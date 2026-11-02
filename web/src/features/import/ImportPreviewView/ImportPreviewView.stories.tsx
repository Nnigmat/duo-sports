import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { previewFixture } from '../fixtures';
import { EMPTY_CHOICES } from '../preview';
import { ImportPreviewView } from './ImportPreviewView';

const meta = {
  title: 'Features/Import/ImportPreviewView',
  component: ImportPreviewView,
  args: { data: previewFixture, choices: EMPTY_CHOICES, onChoicesChange: fn(), onBack: fn(), onNext: fn() },
  render: (args) => {
    const [choices, setChoices] = useState(args.choices);
    return <ImportPreviewView {...args} choices={choices} onChoicesChange={(c) => { setChoices(c); args.onChoicesChange(c); }} />;
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Артборд «Импорт · 2 Проверка». Итог внизу пересчитывается по выбору для новых упражнений.' } } },
} satisfies Meta<typeof ImportPreviewView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Проверьте, что загружаем' })).toBeVisible();
    await expect(c.getByText(/Вставленный текст: 486 строк/)).toBeVisible();
    await expect(c.getByText('26 тренировок')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    await expect(args.onNext).toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Назад' }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};

export const TotalFollowsChoices: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Похожие — из библиотеки' }));
    await expect(c.getByText(/25 новых упражнений · 6 из библиотеки/)).toBeVisible();
    const first = within(c.getByRole('group', { name: 'Что сделать с «Обратные отжимания от лавочки»' }));
    await userEvent.click(first.getByRole('button', { name: 'Не создавать' }));
    await expect(c.getByText(/24 новых упражнения · 6 из библиотеки · 1 без упражнения/)).toBeVisible();
  },
};

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const WithWarnings: Story = {
  args: { data: { ...previewFixture, warnings: ['Строка 2: Незнакомое поле: мечта', 'Строка 30: «Растяжка» без даты'] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = within(c.getByRole('list', { name: 'Предупреждения разбора' }));
    await expect(list.getAllByRole('status')).toHaveLength(2);
    await expect(list.getByText('Строка 2: Незнакомое поле: мечта')).toBeVisible();
  },
};
