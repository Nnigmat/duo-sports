import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { Button } from '../Button/Button';
import { Dialog } from './Dialog';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  args: {
    open: false,
    onOpenChange: () => {},
    title: 'Закончить тренировку?',
    description: 'Выполненные подходы сохранятся.',
    confirmLabel: 'Закончить',
    cancelLabel: 'Отмена',
    danger: false,
    loading: false,
    onConfirm: fn(),
  },
  argTypes: { danger: { control: 'boolean' }, loading: { control: 'boolean' } },
  parameters: {
    docs: { description: { component: `В макете нет: собран из токенов (canvas, rounded-xl, elevation-3, scrim, secondary + primary/danger). Ближайший по духу артборд — «Изменить подход». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo(args: React.ComponentProps<typeof Dialog> & { startOpen?: boolean }) {
  const [open, setOpen] = useState(args.startOpen ?? false);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть диалог
      </Button>
      <Dialog
        {...args}
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => {
          args.onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}

async function open(canvasElement: HTMLElement) {
  const trigger = within(canvasElement).getByRole('button', { name: 'Открыть диалог' });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Закончить тренировку?' });
  await expect(dialog).toContainElement(document.activeElement as HTMLElement);
  return { trigger, dialog };
}

export const Default: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    const { trigger } = await open(canvasElement);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const CloseByScrim: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    const { trigger } = await open(canvasElement);
    const scrim = Array.from(document.body.querySelectorAll('div[data-state="open"]')).find((el) => !el.getAttribute('role'));
    await userEvent.click(scrim as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Cancel: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const { trigger } = await open(canvasElement);
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(args.onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Confirm: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const { trigger } = await open(canvasElement);
    await userEvent.click(screen.getByRole('button', { name: 'Закончить' }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const OpenDefault: Story = { render: (args) => <Demo {...args} startOpen /> };

export const OpenDanger: Story = {
  args: { title: 'Удалить запись?', description: 'Видео подхода удалится без возможности восстановить.', confirmLabel: 'Удалить', danger: true },
  render: (args) => <Demo {...args} startOpen />,
};

export const OpenLoading: Story = {
  args: { loading: true },
  render: (args) => <Demo {...args} startOpen />,
};
