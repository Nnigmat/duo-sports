import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT, Row } from '../storyKit';
import { ToneDot } from './ToneDot';

const meta = {
  title: 'UI/ToneDot',
  component: ToneDot,
  args: { tone: 'primary' },
  argTypes: { tone: { control: 'inline-radio', options: ['primary', 'teal', 'amber', 'slate'] } },
  parameters: { docs: { description: { component: `Артборд «Десктоп · План» (метки типов тренировок). Только метка: название всегда рядом. ${ARTIFACT}` } } },
} satisfies Meta<typeof ToneDot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Декоративная точка не попадает в дерево доступности
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
    await expect(canvasElement.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Row label="primary · teal · amber · slate">
      {(['primary', 'teal', 'amber', 'slate'] as const).map((t) => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--body-sm-size)' }}>
          <ToneDot tone={t} />
          {t}
        </span>
      ))}
    </Row>
  ),
};
