import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { doneState, restState, workoutState } from '../../../data/fixtures';
import { Row, Stack } from '../../../ui/storyKit';
import { TodayHero } from './TodayHero';

const meta = {
  title: 'Features/Today/TodayHero',
  component: TodayHero,
  args: {
    state: workoutState,
    onStart: fn(),
    onReschedule: fn(),
    onOpenExercises: fn(),
    onStretch: fn(),
    onTrainAnyway: fn(),
    onOpenSummary: fn(),
  },
  parameters: {
    docs: { description: { component: 'Чибик на диске и карточка дня. Артборды «Сегодня» (десктоп и телефон). Список упражнений показывается от 768 px, кнопка «Упражнения» только на телефоне.' } },
  },
} satisfies Meta<typeof TodayHero>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Workout: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { name: 'Ноги и ягодицы' })).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: 'Старт' }));
    await expect(args.onStart).toHaveBeenCalledTimes(1);
  },
};

export const WorkoutNotMoved: Story = {
  args: { state: { kind: 'workout', workout: { ...(workoutState.kind === 'workout' ? workoutState.workout : (null as never)), movedFrom: undefined } } },
};

export const Rest: Story = {
  args: { state: restState },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Тренироваться сегодня' }));
    await expect(args.onTrainAnyway).toHaveBeenCalledTimes(1);
  },
};

export const RestWithoutNext: Story = {
  args: { state: { kind: 'rest', next: null } },
};

export const Done: Story = {
  args: { state: doneState },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Посмотреть итоги' }));
    await expect(args.onOpenSummary).toHaveBeenCalledTimes(1);
  },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
};

export const AllStates: Story = {
  render: (args) => (
    <Stack>
      <Row label="тренировка"><TodayHero {...args} state={workoutState} /></Row>
      <Row label="отдых"><TodayHero {...args} state={restState} /></Row>
      <Row label="сделано"><TodayHero {...args} state={doneState} /></Row>
    </Stack>
  ),
};
