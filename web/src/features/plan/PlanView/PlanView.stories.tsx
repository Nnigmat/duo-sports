import { useReducer, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planFixture } from '../../../data/fixtures';
import type { PlanData } from '../../../data/types';
import { initialPlanState, planReducer } from '../plan';
import { PlanView } from './PlanView';

const noop = {
  onStart: fn(),
  onResults: fn(),
  onMove: fn(),
  onEdit: fn(),
  onRemove: fn(),
  onCreate: fn(),
  onAdd: fn(),
  onCopy: fn(),
  onImport: fn(),
};

const meta = {
  title: 'Features/Plan/PlanView',
  component: PlanView,
  args: { data: planFixture, state: initialPlanState(planFixture.today), dispatch: fn(), ...noop },
  parameters: {
    docs: { description: { component: 'Артборды «Десктоп · План», «…пустой день», «…копия тренировки». Мобильной раскладки в макете нет: календарь с метками вместо названий и карточка дня под ним.' } },
  },
} satisfies Meta<typeof PlanView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'План' })).toBeVisible();
    await expect(c.getByRole('heading', { level: 2, name: 'Октябрь 2026' })).toBeVisible();
    await expect(c.getByRole('heading', { level: 2, name: 'Ноги и ягодицы' })).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Импорт из YAML' })).toBeNull();
    await userEvent.click(c.getByRole('button', { name: /^Понедельник, 26 октября/ }));
    await expect(args.dispatch).toHaveBeenCalledWith({ type: 'pick', date: '2026-10-26', today: '2026-10-31' });
  },
};
export const Desktop: Story = {
  args: { layout: 'desktop' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Нажми на день, чтобы посмотреть тренировку или добавить новую.')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Импорт из YAML' }));
    await expect(args.onImport).toHaveBeenCalled();
  },
};
export const EmptyDay: Story = {
  args: { layout: 'desktop', state: initialPlanState(planFixture.today, '2026-11-03') },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 2, name: 'Ничего не запланировано' })).toBeVisible();
  },
};
export const CopyOpen: Story = {
  args: {
    layout: 'desktop',
    state: { ...initialPlanState(planFixture.today), copyOpen: true, copyDate: '2026-11-03' },
  },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('group', { name: 'Копировать на другую дату' })).toBeVisible();
  },
};
export const WeekView: Story = {
  args: { state: { ...initialPlanState(planFixture.today), view: 'week' } },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: '26 октября – 1 ноября' })).toBeVisible();
    await expect(c.getByRole('tab', { name: 'Неделя' })).toHaveAttribute('aria-selected', 'true');
  },
};

function Live({ layout }: { layout: 'mobile' | 'desktop' }) {
  const [state, dispatch] = useReducer(planReducer, initialPlanState(planFixture.today));
  const [data, setData] = useState<PlanData>(planFixture);
  const put = (date: string, entry: PlanData['entries'][string] | null) =>
    setData((d) => {
      const entries = { ...d.entries };
      if (entry) entries[date] = entry;
      else delete entries[date];
      return { ...d, entries };
    });
  return (
    <PlanView
      data={data}
      state={state}
      dispatch={dispatch}
      layout={layout}
      {...noop}
      onAdd={(date, templateId) => put(date, { templateId, status: 'planned', custom: true })}
      onRemove={(date) => put(date, null)}
      onCopy={(from, to) => {
        const src = data.entries[from];
        if (src) put(to, { templateId: src.templateId, status: 'planned', custom: true });
      }}
    />
  );
}
export const InteractiveMobile: Story = {
  render: () => <Live layout="mobile" />,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Ноябрь, пустой вторник: добавляем готовую тренировку, затем убираем
    await userEvent.click(c.getByRole('button', { name: 'Вперёд' }));
    await expect(c.getByRole('heading', { level: 2, name: 'Ноябрь 2026' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: /^Вторник, 3 ноября: нет тренировки/ }));
    await userEvent.click(c.getByRole('button', { name: /^Верх тела ≈/ }));
    await expect(c.getByRole('heading', { level: 2, name: 'Верх тела' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Убрать' }));
    await expect(c.getByRole('heading', { level: 2, name: 'Ничего не запланировано' })).toBeVisible();
  },
};
export const InteractiveDesktop: Story = {
  render: () => <Live layout="desktop" />,
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Копия сегодняшней тренировки на вторник, 3 ноября, через клик по календарю
    await userEvent.click(c.getByRole('button', { name: 'Копировать' }));
    await userEvent.click(c.getByRole('button', { name: 'Вперёд' }));
    await userEvent.click(c.getByRole('button', { name: /^Вторник, 3 ноября/ }));
    await expect(c.getByLabelText('Дата')).toHaveValue('2026-11-03');
    await userEvent.click(c.getByRole('button', { name: 'Создать копию' }));
    await expect(c.getByText(/скопирована на вторник, 3 ноября/)).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Открыть день' }));
    await expect(c.getByRole('heading', { level: 2, name: 'Ноги и ягодицы' })).toBeVisible();
    await expect(c.getByText('Вторник, 3 ноября')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Убрать' }));
    await expect(c.getByRole('heading', { level: 2, name: 'Ничего не запланировано' })).toBeVisible();
  },
};
