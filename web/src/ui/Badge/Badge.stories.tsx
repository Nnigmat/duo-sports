import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT, Row } from '../storyKit';
import { Badge } from './Badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Новый', tone: 'accent' },
  argTypes: { tone: { control: 'inline-radio', options: ['accent', 'neutral', 'highlight', 'primary'] }, children: { control: 'text' } },
  parameters: { docs: { description: { component: `Артборд «Все комментарии тренера» (метка «Новый»). ${ARTIFACT}` } } },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Neutral: Story = { args: { tone: 'neutral', children: 'Черновик' } };
export const Primary: Story = { args: { tone: 'primary', children: 'Сегодня' } };
export const Highlight: Story = { args: { tone: 'highlight', children: 'Серия 5 дней' } };

export const AllVariants: Story = {
  render: () => (
    <Row label="accent · neutral · highlight · primary">
      <Badge>Новый</Badge>
      <Badge tone="neutral">Черновик</Badge>
      <Badge tone="highlight">Серия 5 дней</Badge>
      <Badge tone="primary">Сегодня</Badge>
    </Row>
  ),
};
