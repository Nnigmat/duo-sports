import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PastModePanel } from './PastModePanel';

const meta = {
  title: 'Features/Import/PastModePanel',
  component: PastModePanel,
  args: {
    past: 'skip',
    onPastChange: () => {},
    startLabel: '27 октября',
    pastCount: 2,
  },
  render: (args) => {
    const [past, setPast] = useState(args.past);
    return <PastModePanel {...args} past={past} onPastChange={setPast} />;
  },
  parameters: { docs: { description: { component: 'Артборд «Импорт · 3 План»: что делать с прошлыми днями.' } } },
} satisfies Meta<typeof PastModePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Пропустить их' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: 'Сдвинуть план на неделю' }));
    await expect(c.getByRole('button', { name: 'Сдвинуть план на неделю' })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByRole('button', { name: 'Пропустить их' })).toHaveAttribute('aria-pressed', 'false');
  },
};

export const NothingInPast: Story = {
  args: { pastCount: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('group', { name: 'Что делать с прошлыми днями' })).toBeNull();
  },
};
