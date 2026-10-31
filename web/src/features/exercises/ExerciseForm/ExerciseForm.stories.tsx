import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { draftFromExercise, emptyDraft } from '../library';
import { plank, squat } from '../mock';
import type { ExerciseDraft } from '../types';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseFormScreen } from './ExerciseFormScreen';

const meta = {
  title: 'Features/Exercises/ExerciseForm',
  component: ExerciseForm,
  args: { draft: emptyDraft(), onChange: fn() },
  parameters: { bleed: true, docs: { description: { component: 'Поля формы упражнения и экраны «Новое упражнение» и «Редактирование». Артборды «Новое упражнение» (4 состояния) и «Карточка · Редактирование».' } } },
} satisfies Meta<typeof ExerciseForm>;
export default meta;
type Story = StoryObj<typeof meta>;

function Live({ initial, ...rest }: { initial: ExerciseDraft } & Partial<React.ComponentProps<typeof ExerciseForm>>) {
  const [draft, setDraft] = useState(initial);
  return (
    <div style={{ padding: 16 }}>
      <ExerciseForm {...rest} draft={draft} onChange={setDraft} />
    </div>
  );
}

export const Empty: Story = {
  render: () => <Live initial={emptyDraft()} showGroupHint />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Название'), 'Мост');
    await userEvent.click(c.getByRole('radio', { name: /На время/ }));
    await expect(c.getByText('Время подхода')).toBeVisible();
    await expect(c.queryByText('Вес')).toBeNull();
    await userEvent.click(c.getByRole('button', { name: 'Спина' }));
    await expect(c.getByText('В списке упражнение окажется в разделе «Спина».')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Гиря' }));
    await expect(c.getByRole('button', { name: 'Гиря' })).toHaveAttribute('aria-pressed', 'true');
  },
};
export const WeightPrefilled: Story = {
  render: () => <Live initial={draftFromExercise(squat)} />,
};
export const TimePrefilled: Story = {
  render: () => <Live initial={draftFromExercise(plank)} />,
};

const noop = () => {};
export const CreateScreen: Story = {
  render: () => <ExerciseFormScreen mode="create" onCancel={noop} onSubmit={noop} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Создать' })).toBeDisabled();
    await userEvent.type(c.getByLabelText('Название'), 'Болгарские выпады');
    await expect(c.getByRole('button', { name: 'Создать' })).toBeEnabled();
  },
};
export const EditScreen: Story = {
  render: () => <ExerciseFormScreen mode="edit" exercise={squat} onCancel={noop} onSubmit={noop} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('radio', { name: /Собственный вес/ }));
    await expect(c.getByText(/Прошлые подходы сохранятся как есть/)).toBeVisible();
  },
};
