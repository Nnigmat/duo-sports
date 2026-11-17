import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AiRulesView } from './AiRulesView';

const DEFAULT_TEXT = 'В разминке и заминке сначала упражнения стоя, потом сидя, потом лёжа, чтобы не вставать и не ложиться несколько раз.';
// Время по местному поясу браузера: история не зависит от часового пояса машины
const EDITED_AT = new Date(2026, 10, 17, 21, 40).toISOString();

const meta = {
  title: 'Features/AiRules/AiRulesView',
  component: AiRulesView,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: {
    rules: { text: DEFAULT_TEXT, updatedAt: null, updatedBy: null },
    text: DEFAULT_TEXT,
    saving: false,
    error: null,
    saved: false,
    onText: fn(),
    onSave: fn(),
  },
} satisfies Meta<typeof AiRulesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Правила агента');
    await expect(c.queryByText(/Изменено/)).toBeNull();
    // Текст не менялся — сохранять нечего
    await expect(c.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  },
};

export const Edited: Story = {
  args: {
    rules: { text: 'Отдых между подходами 90 с', updatedAt: EDITED_AT, updatedBy: 'Никита' },
    text: 'Отдых между подходами 90 с. Без прыжков.',
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const area = c.getByLabelText('Правила для агента');
    await expect(area.tagName).toBe('TEXTAREA');
    const save = c.getByRole('button', { name: 'Сохранить' });
    await expect(save.tagName).toBe('BUTTON');
    await expect(c.getByText('Изменено 17 ноя, 21:40 · Никита')).toBeVisible();
    await userEvent.type(area, '!');
    await expect(args.onText).toHaveBeenCalled();
    await userEvent.click(save);
    await expect(args.onSave).toHaveBeenCalled();
  },
};

export const Saving: Story = {
  args: { text: 'Новый текст', saving: true },
};

export const Saved: Story = {
  args: { rules: { text: 'Отдых 90 с', updatedAt: EDITED_AT, updatedBy: 'Никита' }, text: 'Отдых 90 с', saved: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Сохранено');
  },
};

export const ErrorState: Story = {
  name: 'Error',
  args: { text: 'Новый текст', error: 'Нет связи с сервером' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Нет связи с сервером');
  },
};
