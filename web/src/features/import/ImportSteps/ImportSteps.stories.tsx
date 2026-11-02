import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ImportSteps } from './ImportSteps';

const meta = {
  title: 'Features/Import/ImportSteps',
  component: ImportSteps,
  args: { current: 1 },
  parameters: { docs: { description: { component: 'Артборды «Импорт · 1 Источник» … «4 Готово»: полоска из четырёх шагов.' } } },
} satisfies Meta<typeof ImportSteps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Source: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem')).toHaveLength(4);
    await expect(c.getByText('Источник').closest('li')).toHaveAttribute('aria-current', 'step');
  },
};
export const Check: Story = { args: { current: 2 } };
export const Plan: Story = { args: { current: 3 } };
export const Done: Story = {
  args: { current: 4 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Готово').closest('li')).toHaveAttribute('aria-current', 'step');
    await expect(c.getAllByText(', пройден')).toHaveLength(3);
  },
};
