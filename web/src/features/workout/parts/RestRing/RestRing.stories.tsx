import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../../../../ui/storyKit';
import { RestRing } from './RestRing';

const meta = {
  title: 'Features/Workout/RestRing',
  component: RestRing,
  args: { elapsed: 25, goalSec: 60, reached: false, progress: 25 / 60, onStart: fn() },
  argTypes: { reached: { control: 'boolean' } },
  parameters: {
    docs: {
      description: {
        component: `Кольцо отдыха 168 px. Считает вверх от 00:00 до цели; когда цель достигнута, становится залитой кнопкой «отдыхаете 01:12 · Начать», время идёт дальше. Артборды «Отдых между подходами» и «Отдых окончен». ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof RestRing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Counting: Story = {
  play: async ({ canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer');
    await expect(timer).toHaveAccessibleName('Отдых 00:25 из 01:00');
    await expect(timer).toHaveTextContent('из 01:00');
  },
};

export const GoalReached: Story = {
  args: { elapsed: 72, reached: true, progress: 1 },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const start = c.getByRole('button', { name: /отдыхаете 01:12 Начать/ });
    await expect(start).toHaveTextContent('Начать');
    await userEvent.click(start);
    await expect(args.onStart).toHaveBeenCalledTimes(1);
  },
};

export const AllStates: Story = {
  render: () => (
    <Stack>
      <Row label="начало">
        <RestRing elapsed={0} goalSec={60} reached={false} progress={0} onStart={() => {}} />
      </Row>
      <Row label="идёт">
        <RestRing elapsed={25} goalSec={60} reached={false} progress={25 / 60} onStart={() => {}} />
      </Row>
      <Row label="цель достигнута">
        <RestRing elapsed={72} goalSec={60} reached progress={1} onStart={() => {}} />
      </Row>
    </Stack>
  ),
};
