import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { planSourceFixture } from '../fixtures';
import { DEFAULT_OPTIONS } from '../importPlan';
import { ImportPlanView } from './ImportPlanView';

const meta = {
  title: 'Features/Import/ImportPlanView',
  component: ImportPlanView,
  args: { source: planSourceFixture, options: DEFAULT_OPTIONS, onOptionsChange: fn(), total: 26, onBack: fn(), onImport: fn() },
  render: (args) => {
    const [options, setOptions] = useState(args.options);
    return <ImportPlanView {...args} options={options} onOptionsChange={(o) => { setOptions(o); args.onOptionsChange(o); }} />;
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Артборд «Импорт · 3 План». Календарь, подпись и итог пересчитываются по выбору.' } } },
} satisfies Meta<typeof ImportPlanView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'План из файла' })).toBeVisible();
    await expect(c.getByText('26 тренировок · в календаре 24 · 2 пропущено')).toBeVisible();
    await expect(c.getByText('План начинается 27 октября')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Импортировать и добавить в план' }));
    await expect(args.onImport).toHaveBeenCalled();
  },
};

export const ShiftWeek: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Сдвинуть план на неделю' }));
    await expect(c.getByText(/Все даты сдвинуты на 7 дней вперёд/)).toBeVisible();
    await expect(c.getByText('26 тренировок · в календаре 26')).toBeVisible();
  },
};

export const ResolveConflicts: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole('group', { name: 'Для всех' })).getByRole('button', { name: 'Оставить мою' }));
    await expect(c.getByText('26 тренировок · в календаре 22 · 2 пропущено')).toBeVisible();
  },
};

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
