import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT } from '../storyKit';
import { StatTile } from './StatTile';

const meta = {
  title: 'UI/StatTile',
  component: StatTile,
  args: { value: '60 кг × 10', label: 'Рекорд' },
  parameters: { docs: { description: { component: `Показатели в карточке упражнения. ${ARTIFACT}` } } },
} satisfies Meta<typeof StatTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pair: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', maxWidth: 358 }}>
      <StatTile value="60 кг × 10" label="Рекорд" />
      <StatTile value="12" label="Тренировок" />
    </div>
  ),
};
