import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { planTemplates } from '../../../data/fixtures';
import { ToneLegend } from './ToneLegend';

const meta = {
  title: 'Features/Plan/ToneLegend',
  component: ToneLegend,
  args: { templates: planTemplates },
  parameters: { docs: { description: { component: 'Артборд «Десктоп · План» (подпись цветов под календарём).' } } },
} satisfies Meta<typeof ToneLegend>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('list', { name: 'Типы тренировок' })).toBeVisible();
    await expect(c.getAllByRole('listitem')).toHaveLength(4);
  },
};
export const TwoTypes: Story = { args: { templates: planTemplates.slice(0, 2) } };
