import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT, Row } from '../storyKit';
import { SetChip } from './SetChip';

const meta = {
  title: 'UI/SetChip',
  component: SetChip,
  args: { n: 1, label: '90 кг × 5', completed: true },
  parameters: { docs: { description: { component: `Подход в разборе тренировки. ${ARTIFACT}` } } },
} satisfies Meta<typeof SetChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithVideo: Story = {
  args: { n: 4, hasVideo: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/есть видео/)).toBeInTheDocument();
  },
};
export const NotCompleted: Story = {
  args: { n: 3, completed: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/не выполнен/)).toBeInTheDocument();
  },
};
export const LongLabel: Story = { args: { n: 12, label: '102,5 кг × 10–12', hasVideo: true } };

export const Group: Story = {
  render: () => (
    <Row label="выполнен · с видео · не выполнен">
      <SetChip n={1} label="60 кг × 10" completed />
      <SetChip n={2} label="80 кг × 5" completed hasVideo />
      <SetChip n={3} label="80 кг × 5" completed={false} />
    </Row>
  ),
};
