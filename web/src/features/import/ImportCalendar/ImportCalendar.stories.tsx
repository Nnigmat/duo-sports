import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { planSourceFixture } from '../fixtures';
import { buildPlan, DEFAULT_OPTIONS } from '../importPlan';
import { ImportCalendar } from './ImportCalendar';

const plan = buildPlan(planSourceFixture, DEFAULT_OPTIONS);

const meta = {
  title: 'Features/Import/ImportCalendar',
  component: ImportCalendar,
  args: { title: '3 нояб — 21 янв', note: 'Первая неделя пропускается, план идёт с 3 ноября', weeks: plan.weeks },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 3 План»: календарь недель. Тип дня — форма рамки и подпись для скринридера.' } } },
} satisfies Meta<typeof ImportCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: '3 нояб — 21 янв' })).toBeVisible();
    await expect(c.getAllByRole('row')).toHaveLength(14); // шапка и 13 недель
    await expect(c.getByRole('list', { name: 'Обозначения' })).toBeVisible();
    await expect(c.getAllByText(/^конфликт:/)).toHaveLength(2);
    await expect(c.getAllByText(/^пропущена:/)).toHaveLength(2);
  },
};

export const WithShift: Story = {
  args: { weeks: buildPlan(planSourceFixture, { ...DEFAULT_OPTIONS, past: 'shift' }).weeks },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('row')).toHaveLength(15);
  },
};

export const Muted: Story = { args: { weeks: buildPlan(planSourceFixture, { ...DEFAULT_OPTIONS, planOn: false }).weeks } };
