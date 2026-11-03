import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { planSourceFixture } from '../fixtures';
import { buildPlan, DEFAULT_OPTIONS, resolveAll, type ConflictChoice } from '../importPlan';
import { ConflictsSection } from './ConflictsSection';

const meta = {
  title: 'Features/Import/ConflictsSection',
  component: ConflictsSection,
  args: { conflicts: buildPlan(planSourceFixture, DEFAULT_OPTIONS).conflicts, onChoice: () => {}, onChoiceAll: () => {} },
  // Решения живут в состоянии, как в контейнере
  render: () => {
    const [res, setRes] = useState<Record<string, ConflictChoice>>({});
    const conflicts = buildPlan(planSourceFixture, { ...DEFAULT_OPTIONS, resolutions: res }).conflicts;
    return (
      <ConflictsSection
        conflicts={conflicts}
        onChoice={(date, choice) => setRes({ ...res, [date]: choice })}
        onChoiceAll={(choice) => setRes(resolveAll(conflicts, choice))}
      />
    );
  },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 3 План»: решения по дням, где уже стоит своя тренировка. По умолчанию — «Заменить».' } } },
} satisfies Meta<typeof ConflictsSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Конфликты · 2' })).toBeVisible();
    await expect(c.getByText('Ваша «Всё тело» и «Грудь, кор, спина» из файла')).toBeVisible();
    const all = within(c.getByRole('group', { name: 'Для всех' }));
    await expect(all.getByRole('button', { name: 'Заменить' })).toHaveAttribute('aria-pressed', 'true');
  },
};

export const PickOne: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const day = within(c.getByRole('group', { name: 'Решение для 5 нояб' }));
    await userEvent.click(day.getByRole('button', { name: 'Оставить мою' }));
    await expect(day.getByRole('button', { name: 'Оставить мою' })).toHaveAttribute('aria-pressed', 'true');
    // Решения разные: в «Для всех» ничего не выбрано
    const all = within(c.getByRole('group', { name: 'Для всех' }));
    await expect(all.getByRole('button', { name: 'Заменить' })).toHaveAttribute('aria-pressed', 'false');
  },
};

export const PickAll: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole('group', { name: 'Для всех' })).getByRole('button', { name: 'Оставить обе' }));
    await expect(within(c.getByRole('group', { name: 'Решение для 10 нояб' })).getByRole('button', { name: 'Оставить обе' })).toHaveAttribute('aria-pressed', 'true');
  },
};

export const NoConflicts: Story = {
  args: { conflicts: [] },
  render: (args) => <ConflictsSection {...args} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading')).toBeNull();
  },
};
