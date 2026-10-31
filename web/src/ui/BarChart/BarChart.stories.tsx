import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { BarChart } from './BarChart';

const meta = {
  title: 'UI/BarChart',
  component: BarChart,
  args: {
    values: [40, 42.5, 45, 45, 50, 52.5, 55, 60],
    label: 'Рабочий вес за 8 тренировок: от 40 до 60 кг',
    firstLabel: '40 кг',
    lastLabel: '60 кг',
  },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `График динамики в карточке упражнения. ${ARTIFACT}` } } },
} satisfies Meta<typeof BarChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: /8 тренировок/ })).toBeInTheDocument();
  },
};
export const SingleValue: Story = { args: { values: [60], label: 'Одна тренировка: 60 кг', firstLabel: undefined, lastLabel: undefined } };
