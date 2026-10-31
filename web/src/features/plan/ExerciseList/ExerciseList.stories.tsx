import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { planTemplates } from '../../../data/fixtures';
import { ExerciseList } from './ExerciseList';

const meta = {
  title: 'Features/Plan/ExerciseList',
  component: ExerciseList,
  args: { exercises: planTemplates[2]!.exercises, label: 'Упражнения: Ноги и ягодицы' },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План» (состав тренировки в карточке дня).' } } },
} satisfies Meta<typeof ExerciseList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('list', { name: 'Упражнения: Ноги и ягодицы' })).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(5);
    await expect(c.getByText('4 × 8 · 75 кг')).toBeVisible();
  },
};
export const WithoutWeight: Story = {
  args: { exercises: planTemplates[1]!.exercises, label: 'Упражнения: Кардио и пресс' },
};
