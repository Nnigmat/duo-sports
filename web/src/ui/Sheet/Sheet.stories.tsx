import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Checkbox } from '../Checkbox/Checkbox';
import { Stepper } from '../Stepper/Stepper';
import { Text } from '../Text/Text';
import { Sheet } from './Sheet';

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  args: { open: false, onOpenChange: () => {}, title: 'Изменить подход', eyebrow: 'Подход 1 из 9 · круг 1', tall: false, children: null },
  argTypes: { tall: { control: 'boolean' }, title: { control: 'text' }, eyebrow: { control: 'text' } },
  parameters: {
    docs: { description: { component: `Артборды «Изменить подход» (обычная), «Все комментарии тренера» и «Техника» (tall, top 40 px). ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ tall, startOpen = false, eyebrow, title, onBack }: { tall?: boolean; startOpen?: boolean; eyebrow?: string; title: string; onBack?: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const [reps, setReps] = useState(18);
  const [checked, setChecked] = useState(false);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть панель
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={title} eyebrow={eyebrow} tall={tall} onBack={onBack}>
        {tall ? (
          Array.from({ length: 14 }, (_, i) => (
            <Card key={i}>
              <Text variant="body-sm" tag="span">Строка {i + 1}</Text>
            </Card>
          ))
        ) : (
          <>
            <Stepper label="Повторения" value={reps} onChange={setReps} hint="План: 18–20" />
            <Checkbox label="Применить к следующим кругам" hint="Подходы 4 и 7" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <Button onClick={() => setOpen(false)}>Сохранить</Button>
          </>
        )}
      </Sheet>
    </>
  );
}

async function openAndCheckFocus(canvasElement: HTMLElement, title: string) {
  const trigger = within(canvasElement).getByRole('button', { name: 'Открыть панель' });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: title });
  await expect(dialog).toContainElement(document.activeElement as HTMLElement);
  return { trigger, dialog };
}

/** Открытая панель: то, что видно в Storybook. Проверки закрытия ниже скрыты из интерфейса, но идут в vitest. */
export const Default: Story = {
  render: () => <Demo startOpen title="Изменить подход" eyebrow="Подход 1 из 9 · круг 1" />,
};

export const CloseByEscape: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo title="Изменить подход" eyebrow="Подход 1 из 9 · круг 1" />,
  play: async ({ canvasElement }) => {
    const { trigger } = await openAndCheckFocus(canvasElement, 'Изменить подход');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const CloseByScrim: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo title="Изменить подход" />,
  play: async ({ canvasElement }) => {
    const { trigger } = await openAndCheckFocus(canvasElement, 'Изменить подход');
    const scrim = Array.from(document.body.querySelectorAll('div[data-state="open"]')).find((el) => !el.getAttribute('role'));
    await userEvent.click(scrim as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const CloseByButton: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo title="Изменить подход" />,
  play: async ({ canvasElement }) => {
    const { trigger } = await openAndCheckFocus(canvasElement, 'Изменить подход');
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Tall: Story = {
  render: () => <Demo startOpen tall title="Высокая панель" />,
};

export const TallCloseByEscape: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo tall title="Высокая панель" />,
  play: async ({ canvasElement }) => {
    const { trigger } = await openAndCheckFocus(canvasElement, 'Высокая панель');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const OpenNormal: Story = {
  render: () => <Demo startOpen title="Изменить подход" eyebrow="Подход 1 из 9 · круг 1" />,
};

export const OpenTall: Story = {
  render: () => <Demo startOpen tall title="Высокая панель" />,
};

export const WithBack: Story = {
  render: () => <Demo tall title="Комментарии тренера" onBack={fn()} />,
  play: async ({ canvasElement }) => {
    await openAndCheckFocus(canvasElement, 'Комментарии тренера');
    await expect(screen.getByRole('button', { name: 'Назад' })).toBeVisible();
  },
};
