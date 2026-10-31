import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { achievementsFixture } from '../../../data/fixtures';
import { CategorySection } from './CategorySection';

const [streak, , strength] = achievementsFixture.categories;

const meta = {
  title: 'Features/Achievements/CategorySection',
  component: CategorySection,
  args: { category: streak! },
} satisfies Meta<typeof CategorySection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithNote: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 2, name: 'Регулярность' })).toBeVisible();
    await expect(c.getByText('2 из 6')).toBeVisible();
    await expect(c.getByText(/Неделя засчитывается/)).toBeVisible();
    await expect(c.getAllByRole('article')).toHaveLength(2);
  },
};
export const FourCards: Story = { args: { category: strength! } };
export const Desktop: Story = {
  args: { layout: 'desktop' },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('2 из 6 уровней')).toBeVisible();
  },
};
