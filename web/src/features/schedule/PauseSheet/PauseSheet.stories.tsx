import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PauseSheet } from './PauseSheet';

const meta = {
  title: 'Features/Schedule/PauseSheet',
  component: PauseSheet,
  args: { open: true, onOpenChange: fn(), onBack: fn(), onPick: fn() },
  parameters: { docs: { description: { component: 'Выбор срока паузы плана: неделя, две недели, месяц.' } } },
} satisfies Meta<typeof PauseSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: /На 2 недели/ }));
    await expect(args.onPick).toHaveBeenCalledWith(14);
  },
};
