import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ImportRecord } from '../../../../../shared/types';
import { expect, fn, userEvent, within } from 'storybook/test';
import { vi } from 'vitest';
import { libraryFixture } from '../fixtures';
import { clockTime } from '../done';
import { planSourceFixture } from '../fixtures';
import { ImportFlow } from './ImportFlow';

const CREATED = '2026-11-02T14:20:00.000Z';
const record = (undoneAt: string | null): ImportRecord => ({
  id: 1,
  createdAt: CREATED,
  undoneAt,
  undoUntil: '2026-11-03T14:20:00.000Z',
  summary: { workouts: 2, inCalendar: 2, created: 5, updated: 0 },
});
/** Сервер на месте: записывает, отменяет и возвращает без обращений к сети */
const fakeActions = () => ({
  commit: fn(async () => record(null)),
  undo: fn(async () => record('2026-11-02T15:00:00.000Z')),
  redo: fn(async () => record(null)),
});

const meta = {
  title: 'Features/Import/ImportFlow',
  component: ImportFlow,
  args: {
    data: { library: libraryFixture, today: '2026-11-02', mine: planSourceFixture.mine },
    view: 'flow',
    links: { import: '/import', format: '/import/format', workouts: '/', plan: '/plan', exercises: '/exercises' },
    onNavigate: fn(),
    onCopy: fn(),
    actions: fakeActions(),
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Все четыре шага подряд. «Проверить» разбирает вставленный YAML; ошибки показываются на первом шаге. Данные пока не сохраняются на сервере.' } } },
} satisfies Meta<typeof ImportFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FullPath: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    // 1. Источник: пример на ближайшие вторник и четверг
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    // 2. Проверка: шесть новых упражнений, создаём все
    await expect(c.getByRole('heading', { level: 1, name: 'Проверьте, что загружаем' })).toBeVisible();
    await expect(c.getByText('тренировки · 1 неделя')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    // 3. План: четверг, 5 нояб, уже занят — конфликт
    await expect(c.getByRole('heading', { level: 1, name: 'План из файла' })).toBeVisible();
    await expect(c.getByRole('heading', { level: 2, name: 'Конфликты · 1' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Импортировать и добавить в план' }));
    // 4. Готово: выбор с проверки дошёл до итогов
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт завершён' })).toBeVisible();
    await expect(c.getByText(`Сегодня в ${clockTime(CREATED)}`)).toBeVisible();
    await expect(args.actions.commit).toHaveBeenCalledTimes(1);
    await expect(c.getByRole('heading', { level: 2, name: 'Новые упражнения · 6' })).toBeVisible();
    await expect(c.getByText('1 тренировка заменена')).toBeVisible();
    // Внутренняя ссылка не перезагружает страницу
    await userEvent.click(c.getByRole('link', { name: 'Открыть план' }));
    await expect(args.onNavigate).toHaveBeenCalledWith('/plan');
  },
};

export const ErrorsStayOnSource: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const field = c.getByRole('textbox', { name: 'Вставьте YAML' });
    await userEvent.click(field);
    await userEvent.paste('version: 1\nworkouts:\n  - title: Т\n    blocks:\n      - type: sets\n        exercises:\n          - { name: Лодочка, reps: много }\n');
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await expect(c.getByText('reps должно быть числом или диапазоном')).toBeVisible();
    await expect(c.getByRole('alert')).toBeVisible();
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт тренировок' })).toBeVisible();
    // Правка текста убирает устаревшие ошибки
    await userEvent.type(field, ' ');
    await expect(c.queryByRole('alert')).toBeNull();
  },
};

export const BackKeepsChoices: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await userEvent.click(c.getByRole('button', { name: 'Похожие — из библиотеки' }));
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    await userEvent.click(c.getByRole('button', { name: 'Назад' }));
    await expect(c.getByText(/4 новых упражнения · 2 из библиотеки/)).toBeVisible();
  },
};

export const UndoAndStartAgain: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    await userEvent.click(c.getByRole('button', { name: 'Импортировать и добавить в план' }));
    await userEvent.click(c.getByRole('button', { name: 'Отменить импорт' }));
    await expect(c.getByRole('heading', { level: 1, name: 'Всё как было' })).toBeVisible();
    await userEvent.click(c.getByRole('link', { name: 'Вставить снова' }));
    // Начали заново: первый шаг и пустое поле
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт тренировок' })).toBeVisible();
    await expect(c.getByRole('textbox', { name: 'Вставьте YAML' })).toHaveValue('');
  },
};

export const FormatPage: Story = {
  args: { view: 'format' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Формат импорта' })).toBeVisible();
    await userEvent.click(c.getByRole('link', { name: 'К импорту' }));
    await expect(args.onNavigate).toHaveBeenCalledWith('/import');
  },
};

export const FormatLink: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('link', { name: 'Полное описание формата' }));
    await expect(args.onNavigate).toHaveBeenCalledWith('/import/format');
  },
};

export const SendsWhatWasChosen: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    await userEvent.click(within(c.getByRole('group', { name: 'Для всех' })).getByRole('button', { name: 'Оставить мою' }));
    await userEvent.click(c.getByRole('button', { name: 'Импортировать и добавить в план' }));
    const sent = vi.mocked(args.actions.commit).mock.calls[0]![0];
    await expect(sent.exercises).toHaveLength(6);
    await expect(sent.workouts.map((w) => w.title)).toEqual(['Трицепс, пресс, ноги', 'Грудь, кор, спина']);
    // «Оставить мою»: в четверг, 5 нояб, у вас уже стоит тренировка — из файла туда ничего не пишем
    await expect(sent.entries).toEqual([{ date: '2026-11-03', workout: 0 }]);
    await expect(sent.replaceDates).toEqual([]);
  },
};

export const SaveFails: Story = {
  args: {
    actions: { ...fakeActions(), commit: fn(async () => Promise.reject(new Error('Нет связи с сервером'))) },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    await userEvent.click(c.getByRole('button', { name: 'Импортировать и добавить в план' }));
    await expect(await c.findByText('Нет связи с сервером')).toBeVisible();
    // Остались на шаге «План»: можно повторить
    await expect(c.getByRole('button', { name: 'Импортировать и добавить в план' })).toBeEnabled();
  },
};

export const UndoFails: Story = {
  args: {
    actions: { ...fakeActions(), undo: fn(async () => Promise.reject(new Error('Отменить импорт можно было в течение 24 часов'))) },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Вставить пример' }));
    await userEvent.click(c.getByRole('button', { name: 'Проверить' }));
    await userEvent.click(c.getByRole('button', { name: 'Далее: план' }));
    await userEvent.click(c.getByRole('button', { name: 'Импортировать и добавить в план' }));
    await userEvent.click(await c.findByRole('button', { name: 'Отменить импорт' }));
    await expect(await c.findByText('Отменить импорт можно было в течение 24 часов')).toBeVisible();
    await expect(c.getByRole('heading', { level: 1, name: 'Импорт завершён' })).toBeVisible();
  },
};
