import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { newExercisesFixture } from '../fixtures';
import { EMPTY_CHOICES } from '../preview';
import { NewExercisesSection } from './NewExercisesSection';

const meta = {
  title: 'Features/Import/NewExercisesSection',
  component: NewExercisesSection,
  args: { exercises: newExercisesFixture, choices: EMPTY_CHOICES, onChoicesChange: () => {} },
  // Выбор живёт в состоянии, как в контейнере
  render: (args) => {
    const [choices, setChoices] = useState(args.choices);
    return <NewExercisesSection {...args} choices={choices} onChoicesChange={setChoices} />;
  },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 2 Проверка»: согласие на каждое новое упражнение. По умолчанию — создать.' } } },
} satisfies Meta<typeof NewExercisesSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Новые упражнения' })).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(8);
    await expect(c.getByRole('status')).toHaveTextContent('создать 31');
    await userEvent.click(c.getByRole('button', { name: 'Показать все 31' }));
    await expect(c.getAllByRole('listitem')).toHaveLength(31);
    await userEvent.click(c.getByRole('button', { name: 'Свернуть' }));
    await expect(c.getAllByRole('listitem')).toHaveLength(8);
  },
};

export const SkipOne: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const first = within(c.getByRole('group', { name: 'Что сделать с «Обратные отжимания от лавочки»' }));
    await userEvent.click(first.getByRole('button', { name: 'Не создавать' }));
    await expect(first.getByRole('button', { name: 'Не создавать' })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByText('Уберём из 4 тренировок')).toBeVisible();
    await expect(c.getByRole('status')).toHaveTextContent('создать 30 · не создавать 1');
  },
};

export const UseSimilar: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Похожие — из библиотеки' }));
    await expect(c.getByRole('status')).toHaveTextContent('создать 25 · взять похожие 6');
    await userEvent.click(c.getByRole('button', { name: 'Создать все' }));
    await expect(c.getByRole('status')).toHaveTextContent('создать 31');
  },
};

export const WithoutGroup: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Без группы мышц/ }));
    await expect(c.getAllByRole('listitem')).toHaveLength(4);
    const select = c.getAllByRole('combobox', { name: 'Группа мышц' })[0];
    await userEvent.selectOptions(select, 'Пресс');
    await expect(select).toHaveValue('Пресс');
    // Если не создавать, выбор группы не нужен
    const row = within(c.getAllByRole('listitem')[0]);
    await userEvent.click(row.getByRole('button', { name: 'Не создавать' }));
    await expect(c.getAllByRole('combobox', { name: 'Группа мышц' })).toHaveLength(3);
  },
};
