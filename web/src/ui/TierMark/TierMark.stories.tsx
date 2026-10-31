import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Row, Stack } from '../storyKit';
import { TierMark } from './TierMark';

const meta = {
  title: 'UI/TierMark',
  component: TierMark,
  args: { tier: 2, size: 48 },
  argTypes: { tier: { control: 'inline-radio', options: [0, 1, 2, 3] } },
  parameters: { docs: { description: { component: 'Форма уровня: пунктирный круг, круг (бронза), шестиугольник (серебро), щит (золото).' } } },
} satisfies Meta<typeof TierMark>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Streak: Story = { args: { tier: 3, streak: true } };

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="Медаль, обводка 2,5">
        {([0, 1, 2, 3] as const).map((t) => <TierMark key={t} tier={t} size={48} />)}
      </Row>
      <Row label="Легенда, обводка 4">
        {([0, 1, 2, 3] as const).map((t) => <TierMark key={t} tier={t} size={24} stroke={4} />)}
      </Row>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(8);
  },
};
