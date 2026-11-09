import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../../../../ui/Button/Button';
import { ARTIFACT } from '../../../../ui/storyKit';
import type { SwapOption } from '../../flow';
import { SwapSheet } from './SwapSheet';

const onPick = fn();

const defaults = { reps: 10, weight: 20, seconds: 30 };
const library: SwapOption[] = [
  { id: 'bench-dips', name: 'Отжимания от скамьи', kind: 'reps', group: 'arms', muscles: ['трицепс', 'грудь'], defaults },
  { id: 'french-press', name: 'Французский жим', kind: 'weight', group: 'arms', muscles: ['трицепс'], defaults },
  { id: 'dips', name: 'Отжимания на брусьях', kind: 'reps', group: 'arms', muscles: ['трицепс', 'грудь'], aliases: ['брусья'], defaults },
  { id: 'biceps-curl', name: 'Сгибания на бицепс', kind: 'weight', group: 'arms', muscles: ['бицепс'], defaults },
  { id: 'plank', name: 'Планка', kind: 'time', group: 'core', muscles: ['пресс', 'кор'], defaults },
];

function Demo({ startOpen = false, items = library }: { startOpen?: boolean; items?: SwapOption[] }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть шторку
      </Button>
      <SwapSheet
        open={open}
        onOpenChange={setOpen}
        currentId="bench-dips"
        currentName="Отжимания от скамьи"
        library={items}
        onPick={(o) => {
          onPick(o);
          setOpen(false);
        }}
      />
    </>
  );
}

const meta = {
  title: 'Features/Workout/SwapSheet',
  component: SwapSheet,
  parameters: {
    docs: {
      description: {
        component: `Шторка «Заменить упражнение» на подходе. Сверху упражнения с теми же мышцами, ниже остальные, над списком поиск по названию. Выбор заменяет упражнение в оставшихся подходах этой тренировки; план тренера не меняется. ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof SwapSheet>;
export default meta;
// SwapSheet требует обработчики и библиотеку, поэтому истории рисуют Demo в render
type Story = StoryObj;

async function open() {
  await userEvent.click(within(document.body).getByRole('button', { name: 'Открыть шторку' }));
  return screen.findByRole('dialog');
}

/** Видимая история: шторка открыта. Проверки поведения ниже скрыты из интерфейса, но идут в vitest. */
export const Default: Story = {
  render: () => <Demo startOpen />,
};

export const SameMusclesFirst: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo />,
  play: async () => {
    const dialog = within(await open());
    await expect(dialog.getByText('Те же мышцы')).toBeVisible();
    await expect(dialog.getByText('Остальные')).toBeVisible();
    // Текущего упражнения в списке нет
    await expect(dialog.queryByRole('button', { name: /Отжимания от скамьи/ })).not.toBeInTheDocument();
    const names = dialog.getAllByRole('button').map((b) => b.textContent ?? '');
    await expect(names.findIndex((n) => n.includes('Отжимания на брусьях'))).toBeLessThan(names.findIndex((n) => n.includes('Планка')));
  },
};

export const PickReplaces: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo />,
  play: async () => {
    onPick.mockClear();
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: /Французский жим/ }));
    await expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'french-press' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  },
};

export const SearchFilters: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo />,
  play: async () => {
    const dialog = within(await open());
    await userEvent.type(dialog.getByRole('searchbox', { name: 'Поиск упражнения' }), 'брусья');
    await expect(dialog.getByRole('button', { name: /Отжимания на брусьях/ })).toBeVisible();
    await expect(dialog.queryByRole('button', { name: /Планка/ })).not.toBeInTheDocument();
    await userEvent.clear(dialog.getByRole('searchbox', { name: 'Поиск упражнения' }));
    await userEvent.type(dialog.getByRole('searchbox', { name: 'Поиск упражнения' }), 'ничего такого');
    await expect(dialog.getByText('Ничего не найдено')).toBeVisible();
  },
};

export const CloseReplacesNothing: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo />,
  play: async () => {
    onPick.mockClear();
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(onPick).not.toHaveBeenCalled();
  },
};
