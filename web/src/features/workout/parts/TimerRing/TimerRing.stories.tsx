import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../../../../ui/storyKit';
import { TimerRing } from './TimerRing';
import { useCountdown } from './useCountdown';

const meta = {
  title: 'Features/Workout/TimerRing',
  component: TimerRing,
  args: { seconds: 18, total: 30 },
  argTypes: {
    paused: { control: 'boolean' },
  },
  parameters: {
    docs: { description: { component: `Кольцо таймера упражнения на базе ProgressRing, 168 px. Артборд «Экран тренировки». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof TimerRing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Work: Story = {
  play: async ({ canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer');
    await expect(timer).toHaveAccessibleName('осталось 00:18');
    await expect(timer).toHaveTextContent('00:18');
  },
};

export const Paused: Story = {
  args: { paused: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('timer')).toHaveAccessibleName('пауза 00:18');
  },
};

export const Toggle: Story = {
  args: { onToggle: fn() },
  play: async ({ canvasElement, args }) => {
    const ring = within(canvasElement).getByRole('button', { name: 'Пауза, 00:18 осталось' });
    await userEvent.click(ring);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
  },
};

export const TogglePaused: Story = {
  args: { onToggle: fn(), paused: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Продолжить, 00:18 пауза' })).toBeVisible();
  },
};

export const Finished: Story = { args: { seconds: 0 } };

export const Lead: Story = {
  args: { seconds: 3, total: 5, alert: true, caption: 'старт через' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('timer')).toHaveAccessibleName('старт через 00:03');
  },
};

export const FinalSeconds: Story = {
  args: { seconds: 4, total: 30, alert: true, caption: 'финиш через' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('timer')).toHaveAccessibleName('финиш через 00:04');
  },
};

export const DoneButton: Story = {
  args: { seconds: 0, onDone: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Готово/ }));
    await expect(args.onDone).toHaveBeenCalledTimes(1);
  },
};

const onFinish = fn();

function LiveRing() {
  const t = useCountdown({ seconds: 3, onFinish });
  return <TimerRing seconds={t.seconds} total={t.total} paused={t.paused} onToggle={t.toggle} />;
}

/** Живой отсчёт на 3 с: пауза держит время, возобновление продолжает, в конце onFinish вызывается один раз. */
export const Live: Story = {
  render: () => <LiveRing />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /Пауза/ }));
    const frozen = c.getByRole('button', { name: /Продолжить/ }).textContent;
    await new Promise((r) => setTimeout(r, 600));
    await expect(c.getByRole('button', { name: /Продолжить/ }).textContent).toBe(frozen);
    await userEvent.click(c.getByRole('button', { name: /Продолжить/ }));
    await expect(await c.findByText('00:00', {}, { timeout: 5000 })).toBeVisible();
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="таймер">
        <TimerRing seconds={30} total={30} />
        <TimerRing seconds={18} total={30} />
        <TimerRing seconds={0} total={30} />
      </Row>
      <Row label="отсчёт и финиш">
        <TimerRing alert seconds={3} total={5} caption="старт через" />
        <TimerRing alert seconds={4} total={30} caption="финиш через" />
        <TimerRing seconds={0} total={30} onDone={() => {}} />
      </Row>
      <Row label="пауза">
        <TimerRing paused seconds={18} total={30} />
        <TimerRing paused seconds={18} total={30} onToggle={() => {}} />
      </Row>
    </Stack>
  ),
};
