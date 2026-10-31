import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Row } from '../storyKit';
import { GoalChip } from './GoalChip';

const meta = {
  title: 'UI/GoalChip',
  component: GoalChip,
  args: { tier: 2, children: 'Цель: Серебро · 8 нед' },
  argTypes: { tier: { control: 'inline-radio', options: [1, 2, 3] } },
} satisfies Meta<typeof GoalChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Цель: Серебро · 8 нед')).toBeVisible();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Row label="Бронза, серебро, золото">
      <GoalChip tier={1}>Цель: Бронза · 4 нед</GoalChip>
      <GoalChip tier={2}>Цель: Серебро · 8 нед</GoalChip>
      <GoalChip tier={3}>Цель: Золото · 16 нед</GoalChip>
    </Row>
  ),
};
