import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PlanOptionsPanel } from './PlanOptionsPanel';

const meta = {
  title: 'Features/Import/PlanOptionsPanel',
  component: PlanOptionsPanel,
  args: {
    planOn: true,
    onPlanOnChange: () => {},
    past: 'skip',
    onPastChange: () => {},
    summary: '24 тренировки в календаре · 3 нояб — 21 янв',
    startLabel: '27 октября',
    pastCount: 2,
  },
  render: (args) => {
    const [planOn, setPlanOn] = useState(args.planOn);
    const [past, setPast] = useState(args.past);
    return <PlanOptionsPanel {...args} planOn={planOn} onPlanOnChange={setPlanOn} past={past} onPastChange={setPast} />;
  },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 3 План»: включить план и решить, что делать с прошлыми днями.' } } },
} satisfies Meta<typeof PlanOptionsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const On: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('switch', { name: 'Добавить тренировки в календарь по датам' })).toBeChecked();
    await expect(c.getByRole('button', { name: 'Пропустить их' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: 'Сдвинуть план на неделю' }));
    await expect(c.getByRole('button', { name: 'Сдвинуть план на неделю' })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByRole('button', { name: 'Пропустить их' })).toHaveAttribute('aria-pressed', 'false');
  },
};

export const Off: Story = {
  args: { planOn: false, summary: 'Тренировки сохранятся без дат — их можно будет поставить в план вручную' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('switch')).not.toBeChecked();
    await expect(c.queryByRole('group', { name: 'Что делать с прошлыми днями' })).toBeNull();
    await userEvent.click(c.getByRole('switch'));
    await expect(c.getByRole('group', { name: 'Что делать с прошлыми днями' })).toBeVisible();
  },
};

export const NothingInPast: Story = {
  args: { pastCount: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('group', { name: 'Что делать с прошлыми днями' })).toBeNull();
  },
};
