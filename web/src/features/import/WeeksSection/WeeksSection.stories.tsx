import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { newExercisesFixture, previewFixture } from '../fixtures';
import { EMPTY_CHOICES, setAction } from '../preview';
import { WeeksSection } from './WeeksSection';

const meta = {
  title: 'Features/Import/WeeksSection',
  component: WeeksSection,
  args: { weeks: previewFixture.weeks, note: previewFixture.weeksNote, newExercises: newExercisesFixture, choices: EMPTY_CHOICES },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 2 Проверка»: тренировки по неделям. Раскрыты неделя 1 и неделя 4; изменения — к тому же дню прошлой недели.' } } },
} satisfies Meta<typeof WeeksSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Тренировки по неделям' })).toBeVisible();
    const week1 = c.getByRole('button', { name: /^Неделя 1 ·/ });
    await expect(week1).toHaveAttribute('aria-expanded', 'true');
    await expect(c.getByRole('button', { name: /^Неделя 2/ })).toHaveAttribute('aria-expanded', 'false');
    await expect(c.getByText('1 замечание')).toBeVisible();
    await expect(c.getAllByText('в прошлом').length).toBeGreaterThan(0);
  },
};

export const ExpandAll: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Развернуть все' }));
    await expect(c.getByRole('button', { name: /^Неделя 13/ })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(c.getByRole('button', { name: 'Свернуть все' }));
    await expect(c.getByRole('button', { name: /^Неделя 1 ·/ })).toHaveAttribute('aria-expanded', 'false');
  },
};

export const SessionDetails: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /^Неделя 2/ }));
    const session = c.getByRole('button', { name: /Вт, 3 нояб/ });
    await userEvent.click(session);
    await expect(session).toHaveAttribute('aria-expanded', 'true');
    await expect(c.getByText('↑ 3 изменения')).toBeVisible();
    await expect(c.getByText('18–20')).toBeVisible(); // старое значение, зачёркнуто
  },
};

export const SkippedExercise: Story = {
  args: { choices: setAction(EMPTY_CHOICES, 'e2', 'skip') }, // «Выпады на месте»
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Вт, 27 окт/ }));
    await expect(c.queryByText('Выпады на месте', { selector: 'span' })).toBeNull();
  },
};

export const NewExerciseMarker: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Вт, 27 окт/ }));
    await expect(c.getAllByRole('link', { name: 'новое упражнение' }).length).toBeGreaterThan(0);
  },
};
