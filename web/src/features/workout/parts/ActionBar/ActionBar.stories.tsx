import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../../../../ui/storyKit';
import { ActionBar } from './ActionBar';

const handlers = {
  onSkip: fn(),
  onDone: fn(),
  onStart: fn(),
  onEdit: fn(),
  onPauseToggle: fn(),
  onAddTime: fn(),
};

const meta = {
  title: 'Features/Workout/ActionBar',
  component: ActionBar,
  decorators: [(Story) => <div style={{ width: 358 }}><Story /></div>],
  parameters: {
    docs: {
      description: {
        component: `Нижний ряд экрана тренировки. Центр зависит от режима: set — «Готово», start — «Старт», timer — кольцо с паузой, rest — кольцо отдыха с «+15 с». Отступ под системную полосу даёт Screen. ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof ActionBar>;
export default meta;
// ActionBar принимает union по mode, поэтому истории задают пропсы в render
type Story = StoryObj;

export const SetMode: Story = {
  render: () => <ActionBar mode="set" onDone={handlers.onDone} onEdit={handlers.onEdit} onSkip={handlers.onSkip} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Готово' }));
    await userEvent.click(c.getByRole('button', { name: 'Изменить' }));
    await userEvent.click(c.getByRole('button', { name: 'Пропустить' }));
    await expect(handlers.onDone).toHaveBeenCalledTimes(1);
    await expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    await expect(handlers.onSkip).toHaveBeenCalledTimes(1);
  },
};

export const Start: Story = {
  render: () => <ActionBar mode="start" onStart={handlers.onStart} onEdit={handlers.onEdit} onSkip={handlers.onSkip} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Старт' }));
    await expect(handlers.onStart).toHaveBeenCalled();
  },
};

export const Timer: Story = {
  render: () => (
    <ActionBar mode="timer" seconds={18} total={30} onPauseToggle={handlers.onPauseToggle} onSkip={handlers.onSkip} />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Пауза' }));
    await expect(handlers.onPauseToggle).toHaveBeenCalledTimes(1);
    await userEvent.click(c.getByRole('button', { name: 'Пауза, 00:18 осталось' }));
    await expect(handlers.onPauseToggle).toHaveBeenCalledTimes(2);
  },
};

export const TimerPaused: Story = {
  render: () => (
    <ActionBar mode="timer" paused seconds={18} total={30} onPauseToggle={handlers.onPauseToggle} onSkip={handlers.onSkip} />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Продолжить' })).toBeVisible();
    await expect(c.getByRole('button', { name: 'Продолжить, 00:18 пауза' })).toBeVisible();
  },
};

export const Rest: Story = {
  render: () => (
    <ActionBar mode="rest" seconds={60} total={60} onAddTime={handlers.onAddTime} onSkip={handlers.onSkip} />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('timer')).toHaveAccessibleName('отдых 01:00');
    await userEvent.click(c.getByRole('button', { name: 'Добавить 15 секунд' }));
    await expect(handlers.onAddTime).toHaveBeenCalled();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="set">
        <ActionBar mode="set" onDone={() => {}} onEdit={() => {}} onSkip={() => {}} />
      </Row>
      <Row label="start">
        <ActionBar mode="start" onStart={() => {}} onEdit={() => {}} onSkip={() => {}} />
      </Row>
      <Row label="timer">
        <ActionBar mode="timer" seconds={18} total={30} onPauseToggle={() => {}} onSkip={() => {}} />
      </Row>
      <Row label="timer, пауза">
        <ActionBar mode="timer" paused seconds={18} total={30} onPauseToggle={() => {}} onSkip={() => {}} />
      </Row>
      <Row label="rest">
        <ActionBar mode="rest" seconds={42} total={60} onAddTime={() => {}} onSkip={() => {}} />
      </Row>
    </Stack>
  ),
};
