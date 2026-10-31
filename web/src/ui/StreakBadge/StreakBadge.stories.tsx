import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Row, Stack } from '../storyKit';
import { StreakBadge } from './StreakBadge';

const meta = {
  title: 'UI/StreakBadge',
  component: StreakBadge,
  args: { count: 3, unit: 'days' },
  argTypes: { unit: { control: 'inline-radio', options: ['days', 'weeks'] } },
} satisfies Meta<typeof StreakBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Days: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('3 дня')).toBeInTheDocument();
  },
};
export const Weeks: Story = {
  args: { count: 5, unit: 'weeks' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('5 недель')).toBeInTheDocument();
  },
};
export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="дни">{[1, 2, 5, 11, 21].map((n) => <StreakBadge key={n} count={n} />)}</Row>
      <Row label="недели">{[1, 2, 5, 11, 21].map((n) => <StreakBadge key={n} count={n} unit="weeks" />)}</Row>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('1 неделя')).toBeInTheDocument();
    await expect(c.getByText('2 недели')).toBeInTheDocument();
  },
};
