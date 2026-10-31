import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { todayFixture } from '../../../data/fixtures';
import { WeekStats } from './WeekStats';

const meta = {
  title: 'Features/Today/WeekStats',
  component: WeekStats,
  args: { stats: todayFixture.insights!.weekStats },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
} satisfies Meta<typeof WeekStats>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/^4\s120\sкг$/)).toBeInTheDocument();
    await expect(c.getByText(/^1\sч\s35\sмин$/)).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { stats: { minutes: 0, volumeKg: 0, sets: 0 } } };
