import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Row, Stack } from '../storyKit';
import { ActivityHeatmap } from './ActivityHeatmap';

const LEVELS = Array.from({ length: 12 * 7 }, (_, i) => ((i * 7 + (i % 5)) % 4) as 0 | 1 | 2 | 3);

const meta = {
  title: 'UI/ActivityHeatmap',
  component: ActivityHeatmap,
  args: { levels: LEVELS, label: 'Активность за 12 недель', fluid: false },
  argTypes: { fluid: { control: 'boolean' } },
} satisfies Meta<typeof ActivityHeatmap>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName('Активность за 12 недель');
  },
};
export const Fluid: Story = {
  args: { fluid: true },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>],
  play: async ({ canvasElement }) => {
    const grid = within(canvasElement).getByRole('img');
    const cell = grid.firstElementChild as HTMLElement;
    await expect(Math.round(cell.getBoundingClientRect().width)).toBe(Math.round(cell.getBoundingClientRect().height));
    await expect(grid.getBoundingClientRect().width).toBeLessThanOrEqual(360);
  },
};
export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="фиксированный"><ActivityHeatmap levels={LEVELS} label="Активность за 12 недель" /></Row>
      <Row label="fluid, 320 px"><div style={{ width: 320 }}><ActivityHeatmap levels={LEVELS} label="Активность за 12 недель" fluid /></div></Row>
    </Stack>
  ),
};
