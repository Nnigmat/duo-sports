import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { TierLegend } from './TierLegend';

const meta = {
  title: 'UI/TierLegend',
  component: TierLegend,
  decorators: [(Story) => <div style={{ maxWidth: 326 }}><Story /></div>],
} satisfies Meta<typeof TierLegend>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem')).toHaveLength(4);
    await expect(c.getByText('Серебро')).toBeVisible();
  },
};
export const WithTitle: Story = {
  args: { title: 'Уровни достижений' },
  decorators: [(Story) => <div style={{ maxWidth: 960 }}><Story /></div>],
};
