import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { TierSteps } from './TierSteps';

const meta = {
  title: 'UI/TierSteps',
  component: TierSteps,
  args: {
    steps: [
      { label: '2 недели', state: 'done' },
      { label: '4 недели', state: 'next' },
      { label: '8 недель', state: 'future' },
    ],
  },
} satisfies Meta<typeof TierSteps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem')).toHaveLength(3);
    await expect(c.getByText(/уровень I получен/)).toBeInTheDocument();
    await expect(c.getByText(/уровень II следующий/)).toBeInTheDocument();
    await expect(c.getByText(/уровень III впереди/)).toBeInTheDocument();
  },
};
export const AllDone: Story = {
  args: {
    steps: [
      { label: '2 недели', state: 'done' },
      { label: '4 недели', state: 'done' },
      { label: '8 недель', state: 'done' },
    ],
  },
};
export const AllFuture: Story = {
  args: {
    steps: [
      { label: '2 недели', state: 'next' },
      { label: '4 недели', state: 'future' },
      { label: '8 недель', state: 'future' },
    ],
  },
};
