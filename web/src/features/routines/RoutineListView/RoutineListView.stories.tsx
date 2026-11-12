import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { routineSummaries } from '../mock';
import { RoutineListView } from './RoutineListView';

const meta = {
  title: 'Features/Routines/RoutineListView',
  component: RoutineListView,
  args: { routines: routineSummaries, kind: 'warmup', query: '', onKindChange: fn(), onQueryChange: fn(), onOpen: fn(), onCreate: fn() },
} satisfies Meta<typeof RoutineListView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('tab', { name: 'Разминки (2)' })).toBeVisible();
    await expect(c.getByRole('tab', { name: 'Заминки (1)' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: /Ноги, лёгкая/ }));
    await expect(args.onOpen).toHaveBeenCalledWith('legs-light');
  },
};
export const Cooldowns: Story = { args: { kind: 'cooldown' } };
export const ReadOnly: Story = { args: { onCreate: undefined } };
export const Loading: Story = { args: { routines: null } };
export const Failed: Story = { args: { routines: null, error: 'Нет связи с сервером', onRetry: fn() } };
export const Empty: Story = { args: { routines: [] } };
export const NothingFound: Story = { args: { query: 'йога' } };
