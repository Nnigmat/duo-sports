import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT, Row } from '../storyKit';
import { StatusBadge } from './StatusBadge';

const meta = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  args: { status: 'review' },
  argTypes: { status: { control: 'select', options: ['review', 'new', 'reviewed', 'today', 'planned', 'moved'] } },
  parameters: { docs: { description: { component: `Статус тренировки и разбора: всегда слово, цвет смысла не несёт. ${ARTIFACT}` } } },
} satisfies Meta<typeof StatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Review: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Ждёт разбора')).toBeVisible();
  },
};
export const Reviewed: Story = { args: { status: 'reviewed' } };
export const Moved: Story = { args: { status: 'moved' } };

export const AllStatuses: Story = {
  render: () => (
    <Row label="review · new · reviewed · today · planned · moved">
      <StatusBadge status="review" />
      <StatusBadge status="new" />
      <StatusBadge status="reviewed" />
      <StatusBadge status="today" />
      <StatusBadge status="planned" />
      <StatusBadge status="moved" />
    </Row>
  ),
  play: async ({ canvasElement }) => {
    for (const t of ['Ждёт разбора', 'Новое', 'Разобрано', 'Сегодня', 'Запланирована', 'Перенесена'])
      await expect(within(canvasElement).getByText(t)).toBeVisible();
  },
};
