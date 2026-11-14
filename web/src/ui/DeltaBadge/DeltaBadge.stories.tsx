import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { DeltaBadge } from './DeltaBadge';

const meta = {
  title: 'UI/DeltaBadge',
  component: DeltaBadge,
  args: { value: -1.5, unit: 'кг' },
  parameters: { docs: { description: { component: `Изменение показателя: число со знаком и единицей, смысл дублирует слово для скринридера. ${ARTIFACT}` } } },
} satisfies Meta<typeof DeltaBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('−1,5 кг')).toBeVisible();
    await expect(c.getByText(', снижение')).toBeInTheDocument();
  },
};

export const Growth: Story = {
  args: { value: 0.5, unit: 'см' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('+0,5 см')).toBeVisible();
    await expect(c.getByText(', рост')).toBeInTheDocument();
  },
};

export const Zero: Story = {
  args: { value: 0, unit: 'см' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('0 см')).toBeVisible();
    await expect(c.getByText(', без изменений')).toBeInTheDocument();
  },
};
