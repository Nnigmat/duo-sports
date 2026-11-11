import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import type { ExerciseKind, SetActual, SetPlan } from '../../../../../../shared/types';
import { Button } from '../../../../ui/Button/Button';
import { ARTIFACT } from '../../../../ui/storyKit';
import { ResultSheet } from './ResultSheet';

const onSave = fn();

type DemoProps = {
  startOpen?: boolean;
  kind: ExerciseKind;
  plan: SetPlan;
  eyebrow?: string;
  actual?: SetActual;
};

function Demo({ startOpen = false, eyebrow = 'Подход 1 из 9', ...p }: DemoProps) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button variant="secondary" compact onClick={() => setOpen(true)}>
        Открыть шторку
      </Button>
      <ResultSheet open={open} onOpenChange={setOpen} eyebrow={eyebrow} onSave={onSave} {...p} />
    </>
  );
}

const meta = {
  title: 'Features/Workout/ResultSheet',
  component: ResultSheet,
  parameters: {
    docs: {
      description: {
        component: `Шторка после «Готово»: сколько спортсмен реально сделал (повторы, вес × повторы или время). Значение заполнено из плана, для диапазона верхней границей; метка «В плане / Меньше плана / Больше плана» и необязательный «Был доп. вес». «Записать» сохраняет факт отдельно от плана, крестик закрывает без сохранения. ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof ResultSheet>;
export default meta;
// ResultSheet требует обработчики и план, поэтому истории рисуют Demo в render
type Story = StoryObj;

async function open() {
  await userEvent.click(within(document.body).getByRole('button', { name: 'Открыть шторку' }));
  return screen.findByRole('dialog');
}

/** Видимые истории: шторка открыта. Проверки поведения ниже скрыты из интерфейса, но идут в vitest. */
export const Reps: Story = {
  render: () => <Demo startOpen kind="reps" plan={{ target: { min: 18, max: 20 } }} />,
};

export const WeightAndReps: Story = {
  render: () => <Demo startOpen kind="weight" eyebrow="Подход 1 из 3" plan={{ target: { min: 12, max: 12 }, weight: 60 }} />,
};

export const Time: Story = {
  render: () => <Demo startOpen kind="time" eyebrow="Подход 1 из 2" plan={{ target: { min: 45, max: 60 } }} />,
};

export const ReopenedWithFact: Story = {
  render: () => <Demo startOpen kind="reps" actual={{ value: 17, extraWeight: true }} plan={{ target: { min: 18, max: 20 } }} />,
};

export const RepsSaveFromPlan: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="reps" plan={{ target: { min: 18, max: 20 } }} />,
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await expect(dialog.getByText('Сколько повторений сделали?')).toBeVisible();
    await expect(dialog.getByText('План: 18–20')).toBeVisible();
    // Старт с верхней границы диапазона
    await expect(dialog.getByText('В плане')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Записать' }));
    await expect(onSave).toHaveBeenCalledWith({ value: 20 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  },
};

export const RepsLabelFollowsValue: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="reps" plan={{ target: { min: 18, max: 20 } }} />,
  play: async () => {
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: 'Больше повторений' }));
    await expect(dialog.getByText('Больше плана')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await expect(dialog.getByText('В плане')).toBeVisible();
    for (let i = 0; i < 2; i++) await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await expect(dialog.getByText('Меньше плана')).toBeVisible();
  },
};

export const WeightSaveWithExtraWeight: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="weight" eyebrow="Подход 1 из 3" plan={{ target: { min: 12, max: 12 }, weight: 60 }} />,
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await expect(dialog.getByText('Сколько сделали?')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Больше вес' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Меньше повторений' }));
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Был доп. вес' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Записать' }));
    await expect(onSave).toHaveBeenCalledWith({ value: 11, weight: 61, extraWeight: true });
  },
};

export const TimeSave: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="time" eyebrow="Подход 1 из 2" plan={{ target: { min: 45, max: 60 } }} />,
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await expect(dialog.getByText('Сколько продержались?')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Время: меньше' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Записать' }));
    await expect(onSave).toHaveBeenCalledWith({ value: 55 });
  },
};

export const RepsTypeAndSave: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="reps" plan={{ target: { min: 18, max: 20 } }} />,
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    const input = dialog.getByRole('textbox', { name: 'Повторения' });
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    // Нативный click не переносит фокус (как тап в iOS Safari): поле не теряет фокус, blur не срабатывает
    await expect(input).toHaveFocus();
    dialog.getByRole('button', { name: 'Записать' }).click();
    await expect(input).toHaveFocus();
    await expect(onSave).toHaveBeenCalledWith({ value: 12 });
  },
};

export const RepsTypeGarbageKeepsValue: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="reps" plan={{ target: { min: 18, max: 20 } }} />,
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    const input = dialog.getByRole('textbox', { name: 'Повторения' });
    await userEvent.clear(input);
    await userEvent.type(input, 'abc');
    await userEvent.click(dialog.getByRole('button', { name: 'Записать' }));
    await expect(onSave).toHaveBeenCalledWith({ value: 20 });
  },
};

export const CloseSavesNothing: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="reps" plan={{ target: { min: 18, max: 20 } }} />,
  play: async () => {
    onSave.mockClear();
    const dialog = within(await open());
    await userEvent.click(dialog.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(onSave).not.toHaveBeenCalled();
  },
};

export const ReopenedShowsFact: Story = {
  tags: ['!dev', '!autodocs'],
  render: () => <Demo kind="reps" actual={{ value: 17, extraWeight: true }} plan={{ target: { min: 18, max: 20 } }} />,
  play: async () => {
    const dialog = within(await open());
    await expect(dialog.getByText('Меньше плана')).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Был доп. вес' })).toBeChecked();
  },
};
