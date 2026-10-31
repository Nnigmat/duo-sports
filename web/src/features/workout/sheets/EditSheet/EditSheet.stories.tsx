import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import type { ExerciseKind, SetPlan } from '../../../../../../shared/types';
import { Button } from '../../../../ui/Button/Button';
import { ARTIFACT } from '../../../../ui/storyKit';
import { EditSheet } from './EditSheet';

const onSave = fn();

type DemoProps = {
  startOpen?: boolean;
  kind: ExerciseKind;
  plan: SetPlan;
  title: string;
  eyebrow: string;
  applyLabel?: string;
  applyHint?: string;
};

function Demo({ applyLabel = 'Применить к следующим кругам', startOpen = false, ...p }: DemoProps) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть панель
      </Button>
      <EditSheet open={open} onOpenChange={setOpen} applyLabel={applyLabel} onSave={onSave} {...p} />
    </>
  );
}

const meta = {
  title: 'Features/Workout/EditSheet',
  component: EditSheet,
  parameters: {
    docs: {
      description: {
        component: `Панель «Изменить подход» для трёх типов упражнений: повторы (с необязательным доп. весом), вес × повторы и время. Сохраняет план шага; галочка распространяет его на следующие подходы. Артборды «Изменить подход», «Повторы + вес — изменить», «Время — изменить». ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof EditSheet>;
export default meta;
// EditSheet требует обработчики и план, поэтому истории рисуют Demo в render
type Story = StoryObj;

async function open() {
  await userEvent.click(within(document.body).getByRole('button', { name: 'Открыть панель' }));
  return screen.findByRole('dialog');
}

/** Видимые истории: панель открыта. Проверки сохранения ниже скрыты из интерфейса, но идут в vitest. */
export const Reps: Story = {
  render: () => (
    <Demo
      startOpen
      kind="reps"
      title="Обратные отжимания"
      eyebrow="Подход 1 из 9 · круг 1"
      plan={{ target: { min: 18, max: 20 } }}
      applyHint="Подходы 4 и 7"
    />
  ),
};

export const WeightAndReps: Story = {
  render: () => (
    <Demo
      startOpen
      kind="weight"
      title="Приседания с гантелью"
      eyebrow="Подход 1 из 3"
      applyLabel="Применить к следующим подходам"
      applyHint="Подходы 2 и 3"
      plan={{ target: { min: 12, max: 12 }, weight: 12 }}
    />
  ),
};

export const Time: Story = {
  render: () => (
    <Demo
      startOpen
      kind="time"
      title="Планка"
      eyebrow="Подход 1 из 2"
      applyLabel="Применить к следующим подходам"
      applyHint="Подход 2"
      plan={{ target: { min: 45, max: 45 } }}
    />
  ),
};

export const RepsSaveAndApply: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => (
    <Demo
      kind="reps"
      title="Обратные отжимания"
      eyebrow="Подход 1 из 9 · круг 1"
      plan={{ target: { min: 18, max: 20 } }}
      applyHint="Подходы 4 и 7"
    />
  ),
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await expect(dialog.getByText('План: 18–20')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await userEvent.click(dialog.getByRole('checkbox', { name: /Применить к следующим кругам/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    await expect(onSave).toHaveBeenCalledWith({ target: { min: 17, max: 17 } }, true);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  },
};

export const RepsKeepRange: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => (
    <Demo kind="reps" title="Выпады" eyebrow="Подход 3 из 9 · круг 1" plan={{ target: { min: 14, max: 16 } }} />
  ),
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await expect(dialog.queryByRole('checkbox')).toBeNull();
    await userEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    await expect(onSave).toHaveBeenCalledWith({ target: { min: 14, max: 16 } }, false);
  },
};

export const RepsAddWeight: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => (
    <Demo kind="reps" title="Ножницы лёжа" eyebrow="Подход 2 из 9 · круг 1" plan={{ target: { min: 30, max: 34 } }} />
  ),
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: 'Добавить вес' }));
    await expect(dialog.getByText('Доп. вес, кг')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    await expect(onSave).toHaveBeenCalledWith({ target: { min: 30, max: 34 }, weight: 2.5 }, false);
  },
};

export const WeightAndRepsSave: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => (
    <Demo
      kind="weight"
      title="Приседания с гантелью"
      eyebrow="Подход 1 из 3"
      applyLabel="Применить к следующим подходам"
      applyHint="Подходы 2 и 3"
      plan={{ target: { min: 12, max: 12 }, weight: 12 }}
    />
  ),
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: 'Больше вес' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await userEvent.click(dialog.getByRole('checkbox', { name: /Применить к следующим подходам/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    await expect(onSave).toHaveBeenCalledWith({ target: { min: 11, max: 11 }, weight: 13 }, true);
  },
};

export const TimeSave: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => (
    <Demo
      kind="time"
      title="Планка"
      eyebrow="Подход 1 из 2"
      applyLabel="Применить к следующим подходам"
      applyHint="Подход 2"
      plan={{ target: { min: 45, max: 45 } }}
    />
  ),
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: '+5 с' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    await expect(onSave).toHaveBeenCalledWith({ target: { min: 50, max: 50 } }, false);
  },
};
