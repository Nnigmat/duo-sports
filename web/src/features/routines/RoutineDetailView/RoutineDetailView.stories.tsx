import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { routineDetail } from '../mock';
import { RoutineDetailView } from './RoutineDetailView';

const meta = {
  title: 'Features/Routines/RoutineDetailView',
  component: RoutineDetailView,
  args: { routine: routineDetail, backLabel: 'Разминки', onBack: fn(), onEdit: fn() },
} satisfies Meta<typeof RoutineDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1 })).toHaveTextContent('Ноги, лёгкая');
    await expect(c.getByText('30 с × 2')).toBeVisible();
  },
};
export const Athlete: Story = { args: { onEdit: undefined } };
export const NotUsed: Story = { args: { routine: { ...routineDetail, usedIn: 0, usedBy: [] } } };
