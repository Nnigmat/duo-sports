import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Row, Stack } from '../storyKit';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  args: { label: 'Присед, до серебра', value: 80, max: 82, valueText: '80 из 82 кг' },
  decorators: [(Story) => <div style={{ maxWidth: 326 }}><Story /></div>],
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar', { name: 'Присед, до серебра' });
    await expect(bar).toHaveAttribute('aria-valuenow', '80');
    await expect(bar).toHaveAttribute('aria-valuetext', '80 из 82 кг');
  },
};
export const Percent: Story = { args: { label: 'Тренировки', value: 31, max: undefined, valueText: undefined } };
export const OverMax: Story = {
  args: { value: 120 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '82');
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      {[0, 25, 63, 97, 100].map((v) => (
        <Row key={v} label={`${v} %`}>
          <div style={{ width: 326 }}><ProgressBar label={`Прогресс ${v} %`} value={v} /></div>
        </Row>
      ))}
    </Stack>
  ),
};
