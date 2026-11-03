import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { athletesFixture, sessionsFixture, TODAY } from '../fixtures';
import { defaultSelection } from '../sessions';
import { AthleteView } from './AthleteView';

const onSelect = fn();
const onClose = fn();

const meta = {
  title: 'Features/Trainer/AthleteView',
  component: AthleteView,
  args: {
    today: TODAY,
    athlete: athletesFixture[0]!,
    sessions: sessionsFixture,
    selection: defaultSelection(sessionsFixture),
    onSelect,
    open: false,
    onClose,
    backHref: '/trainer',
    onBack: fn(),
    onTab: fn(),
    detail: <p>Выбранная тренировка по шагам</p>,
  },
  beforeEach: () => {
    onSelect.mockReset();
    onClose.mockReset();
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Карточка ученика, вкладка «Тренировки»: списки слева, выбранная тренировка справа; на телефоне по очереди: список, затем тренировка. Артборд «Тренер · Карточка ученика».' } } },
} satisfies Meta<typeof AthleteView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Никита Н.' })).toBeVisible();
    await expect(c.getByRole('heading', { name: 'Запланировано' })).toBeVisible();
    await expect(c.getByRole('heading', { name: 'История тренировок' })).toBeVisible();
    // Выбрана ждущая разбора тренировка: состояние в aria-pressed, не только цветом
    await expect(c.getByRole('button', { name: /Вчера|вчера/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByText('Перенесена на пт, 6 ноября')).toBeVisible();
    await expect(c.getByText('Перенесена с ср, 4 ноября')).toBeVisible();
    await expect(c.getByText('Перенесена с чт, 29 октября')).toBeVisible();
    await expect(c.getByText('Новое от ученика')).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

export const SelectOther: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Ноги и ягодицы.*Чт, 5 ноября|Чт, 5 ноября.*Ноги/ }));
    await expect(onSelect).toHaveBeenCalledWith({ kind: 'plan', date: '2026-11-05', workoutId: 13 });
    await userEvent.click(c.getByRole('button', { name: /Кардио и пресс.*Пн|Ср, 28 октября/ }));
    await expect(onSelect).toHaveBeenLastCalledWith({ kind: 'session', sessionId: 6 });
  },
};

export const Touch44: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const el of [...c.getAllByRole('button'), ...c.getAllByRole('link')]) {
      await expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

export const NoSessions: Story = {
  args: { sessions: { planned: [], history: [] }, selection: null, detail: <p>Выберите тренировку слева</p> },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Ничего не запланировано')).toBeVisible();
    await expect(c.getByText('Тренировок пока не было')).toBeVisible();
  },
};

export const NewAthlete: Story = {
  args: { athlete: { ...athletesFixture[1]!, goal: null, lastSession: null, daysSinceLast: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Цель не задана')).toBeVisible();
    await expect(within(canvasElement).getByText('Тренировок ещё не было')).toBeVisible();
  },
};

const longHistory = Array.from({ length: 14 }, (_, i) => ({
  ...sessionsFixture.history[2]!,
  sessionId: 100 + i,
  date: new Date(Date.UTC(2026, 9, 28 - i * 6)).toISOString().slice(0, 10),
  title: `Тренировка ${i + 1}`,
}));

export const ManySessions: Story = {
  args: { sessions: { planned: sessionsFixture.planned, history: longHistory }, selection: null },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Месяцы подписаны, показаны первые 10, остальное по кнопке
    await expect(c.getByRole('heading', { level: 3, name: 'Октябрь' })).toBeVisible();
    await expect(c.getByRole('heading', { level: 3, name: 'Сентябрь' })).toBeVisible();
    await expect(c.queryByText('Тренировка 11')).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Показать ещё' }));
    await expect(c.getByText('Тренировка 14')).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Показать ещё' })).toBeNull();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

/** Телефон, список: тренировка скрыта, кнопки «Назад к списку» нет */
export const PhoneList: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByText('Выбранная тренировка по шагам')).not.toBeVisible();
    await expect(c.getByRole('heading', { name: 'История тренировок' })).toBeVisible();
    await expect(c.getByRole('button', { name: /Вчера|вчера/ }).getBoundingClientRect().width).toBeGreaterThan(330);
  },
};

/** Телефон, открыта тренировка: вместо списка, сверху «← Тренировки» */
export const PhoneDetail: Story = {
  args: { open: true },
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Выбранная тренировка по шагам')).toBeVisible();
    // display: none убирает элемент из дерева доступности
    await expect(c.queryByRole('heading', { name: 'История тренировок' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Тренировки' }));
    await expect(onClose).toHaveBeenCalled();
  },
};

/** Широкий экран: обе колонки, кнопки «← Тренировки» нет даже при open */
export const DesktopBoth: Story = {
  args: { open: true },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Выбранная тренировка по шагам')).toBeVisible();
    await expect(c.getByRole('heading', { name: 'История тренировок' })).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Тренировки' })).toBeNull();
  },
};
