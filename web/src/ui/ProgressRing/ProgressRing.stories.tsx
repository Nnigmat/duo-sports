import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT, Row } from '../storyKit';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
import { ProgressRing } from './ProgressRing';

const meta = {
  title: 'UI/ProgressRing',
  component: ProgressRing,
  args: {
    value: 0.6,
    size: 168,
    color: 'primary',
    children: (
      <>
        <Text variant="h2" tag="span">00:30</Text>
        <Text variant="caption">осталось</Text>
      </>
    ),
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    size: { control: { type: 'number', min: 48, max: 240 } },
    stroke: { control: { type: 'number', min: 2, max: 16 } },
    color: { control: 'inline-radio', options: ['primary', 'accent', 'muted'] },
    smoothing: { control: { type: 'number', min: 0, max: 1000, step: 100 } },
  },
  parameters: { docs: { description: { component: `Артборд «Экран тренировки» (таймер и отдых, 168 px, обводка 8 px). ${ARTIFACT}` } } },
} satisfies Meta<typeof ProgressRing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Accent: Story = { args: { color: 'accent' } };
/** Пауза: дуга серая */
export const Muted: Story = { args: { color: 'muted' } };
export const Empty: Story = { args: { value: 0 } };
/** Для таймера с тиком раз в секунду: smoothing 1000 мс даёт непрерывное движение дуги. */
export const Timer: Story = { args: { smoothing: 1000 } };
export const Full: Story = { args: { value: 1 } };

export const AllVariants: Story = {
  render: () => (
    <Row label="primary · accent · малый с иконкой">
      <ProgressRing value={0.6}>
        <Text variant="h2" tag="span">00:30</Text>
        <Text variant="caption">осталось</Text>
      </ProgressRing>
      <ProgressRing value={0.3} color="accent">
        <Text variant="h2" tag="span">01:00</Text>
        <Text variant="caption">отдых</Text>
      </ProgressRing>
      <ProgressRing value={1} size={96}>
        <Icon name="check" />
      </ProgressRing>
    </Row>
  ),
};
