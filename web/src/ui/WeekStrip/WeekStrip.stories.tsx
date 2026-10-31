import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Row, Stack } from '../storyKit';
import { WeekStrip, type WeekDay } from './WeekStrip';

const WEEK: WeekDay[] = [
  { weekday: 'пн', status: 'done', caption: 'Ноги' },
  { weekday: 'вт', status: 'rest' },
  { weekday: 'ср', status: 'planned', today: true, caption: 'Кардио и пресс' },
  { weekday: 'чт', status: 'rest' },
  { weekday: 'пт', status: 'planned', caption: 'Спина' },
  { weekday: 'сб', status: 'missed', caption: 'Растяжка' },
  { weekday: 'вс', status: 'rest' },
];

const meta = {
  title: 'UI/WeekStrip',
  component: WeekStrip,
  args: { days: WEEK, variant: 'compact' },
  argTypes: { variant: { control: 'inline-radio', options: ['compact', 'wide'] } },
  decorators: [(Story) => <div style={{ maxWidth: 420 }}><Story /></div>],
} satisfies Meta<typeof WeekStrip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText('вт, Отдых')).toBeInTheDocument();
    await expect(c.getByLabelText('ср, сегодня, Запланировано, Кардио и пресс')).toBeInTheDocument();
    await expect(c.getByLabelText('сб, Пропущено, Растяжка')).toBeInTheDocument();
  },
};
export const Wide: Story = {
  args: { variant: 'wide' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByText('Отдых')).toHaveLength(3);
    await expect(c.getByText('Кардио и пресс')).toBeInTheDocument();
  },
};
export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="compact"><div style={{ width: 360 }}><WeekStrip days={WEEK} /></div></Row>
      <Row label="wide"><div style={{ width: 420 }}><WeekStrip days={WEEK} variant="wide" /></div></Row>
    </Stack>
  ),
};

export const Selectable: Story = {
  render: function Render(args) {
    const [i, setI] = useState(2);
    return (
      <div style={{ maxWidth: 420 }}>
        <WeekStrip {...args} days={WEEK.map((d, k) => ({ ...d, date: String(26 + k) }))} selectedIndex={i} onSelect={setI} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: /^ср/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(c.getByRole('button', { name: /^пн/ }));
    await expect(c.getByRole('button', { name: /^пн/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByRole('button', { name: /^ср/ })).toHaveAttribute('aria-pressed', 'false');
  },
};
