import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { routineSummaries } from '../mock';
import { RoutineListView } from './RoutineListView';

const meta = {
  title: 'Features/Routines/RoutineListView',
  component: RoutineListView,
  args: { routines: routineSummaries, kind: 'warmup', query: '', onKindChange: fn(), onQueryChange: fn(), onOpen: fn(), onCreate: fn(), onCopy: fn(async () => {}), onRename: fn(async () => {}) },
  globals: { viewport: { value: 'a15', isRotated: false } },
} satisfies Meta<typeof RoutineListView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('tab', { name: 'Разминки (2)' })).toBeVisible();
    await expect(c.getByRole('tab', { name: 'Заминки (1)' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: /^Ноги, лёгкая/ }));
    await expect(args.onOpen).toHaveBeenCalledWith('legs-light');
  },
};
export const Cooldowns: Story = { args: { kind: 'cooldown' } };
export const ReadOnly: Story = {
  args: { onCreate: undefined, onCopy: undefined, onRename: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: /^Действия/ })).toBeNull();
  },
};

export const Copy: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Действия: Ноги, лёгкая' }));
    const sheet = within(await within(document.body).findByRole('dialog'));
    await expect(sheet.getByText('Ноги, лёгкая копия (1)')).toBeVisible();
    await userEvent.click(sheet.getByRole('button', { name: /Сделать копию/ }));
    await expect(args.onCopy).toHaveBeenCalledWith('legs-light');
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
  },
};

export const Rename: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Действия: Кардио-разогрев' }));
    const sheet = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: /Переименовать/ }));
    const field = sheet.getByLabelText('Название');
    await expect(field).toHaveValue('Кардио-разогрев');
    await userEvent.clear(field);
    await userEvent.type(field, 'Кардио{enter}');
    await expect(args.onRename).toHaveBeenCalledWith('cardio', 'Кардио');
  },
};

export const RenameTaken: Story = {
  args: { onRename: fn(async () => { throw new Error('Разминка с таким названием уже есть'); }) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Действия: Кардио-разогрев' }));
    const sheet = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: /Переименовать/ }));
    const field = sheet.getByLabelText('Название');
    await userEvent.clear(field);
    await userEvent.type(field, 'Ноги, лёгкая{enter}');
    await expect(await sheet.findByText('Разминка с таким названием уже есть')).toBeVisible();
  },
};
export const Loading: Story = { args: { routines: null } };
export const Failed: Story = { args: { routines: null, error: 'Нет связи с сервером', onRetry: fn() } };
export const Empty: Story = { args: { routines: [] } };
export const NothingFound: Story = { args: { query: 'йога' } };
