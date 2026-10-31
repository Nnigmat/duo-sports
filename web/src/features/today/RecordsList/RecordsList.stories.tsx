import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { todayFixture } from '../../../data/fixtures';
import { RecordsList } from './RecordsList';

const meta = {
  title: 'Features/Today/RecordsList',
  component: RecordsList,
  args: { records: todayFixture.insights!.records, onOpenProgress: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
} satisfies Meta<typeof RecordsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(c.getByRole('button', { name: 'Весь прогресс' }));
    await expect(args.onOpenProgress).toHaveBeenCalledTimes(1);
  },
};
