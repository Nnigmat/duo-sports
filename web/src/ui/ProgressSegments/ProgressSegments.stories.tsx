import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../storyKit';
import { ProgressSegments } from './ProgressSegments';

const meta = {
  title: 'UI/ProgressSegments',
  component: ProgressSegments,
  args: { count: 9, current: 4, label: 'Прогресс тренировки' },
  argTypes: { count: { control: { type: 'number', min: 1, max: 20 } }, current: { control: { type: 'number', min: 0, max: 20 } } },
  parameters: { docs: { description: { component: `Артборды «Экран тренировки» и «Тренировка завершена» (пройдено primary, текущий accent-500, впереди hairline). ${ARTIFACT}` } } },
} satisfies Meta<typeof ProgressSegments>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '4');
    await expect(bar).toHaveAttribute('aria-valuetext', 'Пройдено 4 из 9');
  },
};
export const Start: Story = { args: { current: 0 } };
export const Finished: Story = { args: { current: 9 } };

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <ProgressSegments count={9} current={0} label="Начало" />
      <ProgressSegments count={9} current={4} label="Середина" />
      <ProgressSegments count={9} current={9} label="Конец" />
    </Stack>
  ),
};
