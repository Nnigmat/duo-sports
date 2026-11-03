import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { libraryFixture } from '../fixtures';
import { SAMPLE_YAML } from '../import';
import { ImportSourceView } from './ImportSourceView';

const meta = {
  title: 'Features/Import/ImportSourceView',
  component: ImportSourceView,
  args: {
    text: '',
    onTextChange: fn(),
    exercises: libraryFixture,
    onCopyReference: fn(),
    formatHref: '/import/format',
    onCheck: fn(),
  },
  // Текст живёт в состоянии, как в контейнере
  render: (args) => {
    const [text, setText] = useState(args.text);
    return <ImportSourceView {...args} text={text} onTextChange={(t) => { setText(t); args.onTextChange(t); }} />;
  },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Артборд «Импорт · 1 Источник». Контейнер хранит текст; «Проверить» недоступна, пока поле пустое.' } },
  },
} satisfies Meta<typeof ImportSourceView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт тренировок' })).toBeVisible();
    await expect(c.getByRole('list', { name: 'Шаги импорта' })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Проверить' })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Очистить' })).toBeDisabled();
    await expect(c.getByText(/Можно вставить сколько угодно/)).toBeVisible();
  },
};

export const SamplePasted: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await expect(c.getByRole('textbox', { name: 'Вставьте YAML' })).toHaveValue(SAMPLE_YAML);
    await expect(c.getByText(/^Вставлено \d+ строк/)).toBeVisible();
    await expect(c.getByRole('button', { name: 'Проверить' })).toBeEnabled();
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await expect(args.onCheck).toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Очистить' }));
    await expect(c.getByRole('textbox', { name: 'Вставьте YAML' })).toHaveValue('');
  },
};

export const Typed: Story = {
  args: { text: 'version: 1\nworkouts: []' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Вставлено 2 строки')).toBeVisible();
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const WithErrors: Story = {
  args: {
    text: 'version: 1\nworkouts: []',
    issues: [
      { message: 'reps должно быть числом или диапазоном', hint: 'Пишите 10 или "8-12" — без слов и единиц.', line: 8 },
      { message: 'Неизвестный exercise_id: reverse-pushups', hint: 'Исправьте опечатку или опишите упражнение в exercises.', line: 12 },
    ],
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: '2 ошибок в тексте' })).toBeVisible();
    await expect(c.getAllByRole('alert')).toHaveLength(2);
    await expect(c.getByText('Неизвестный exercise_id: reverse-pushups')).toBeVisible();
  },
};
