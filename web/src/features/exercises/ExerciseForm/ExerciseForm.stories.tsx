import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { draftFromExercise, emptyDraft } from '../library';
import { plank, squat } from '../mock';
import type { ExerciseDraft } from '../types';
import { ExerciseForm } from './ExerciseForm';
import { ExerciseFormScreen } from './ExerciseFormScreen';

const meta = {
  title: 'Features/Exercises/ExerciseForm',
  component: ExerciseForm,
  args: { draft: emptyDraft(), onChange: fn() },
  parameters: { docs: { description: { component: 'Поля формы упражнения и экраны «Новое упражнение» и «Редактирование». Артборды «Новое упражнение» (4 состояния) и «Карточка · Редактирование».' } } },
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

export const NotesAndVideo: Story = {
  render: () => <Live initial={emptyDraft()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const notes = c.getByLabelText('Как выполнять');
    await expect(notes).toHaveAccessibleDescription('Один шаг на строку');
    await userEvent.type(notes, 'Встаньте прямо{enter}Опуститесь вниз');
    await expect(notes).toHaveValue('Встаньте прямо\nОпуститесь вниз');
    const video = c.getByLabelText('Ссылка на видео');
    await expect(video).toHaveAttribute('type', 'url');
    await userEvent.type(video, 'https://youtu.be/abc');
    await expect(video).toHaveValue('https://youtu.be/abc');
    await expect(video).not.toHaveAttribute('aria-invalid');
  },
};
export const InvalidVideo: Story = {
  render: () => <Live initial={{ ...emptyDraft(), video: 'ссылка' }} />,
  play: async ({ canvasElement }) => {
    const video = within(canvasElement).getByLabelText('Ссылка на видео');
    await expect(video).toHaveAttribute('aria-invalid', 'true');
    await expect(video).toHaveAccessibleDescription(/http/);
  },
};

const fail = (message: string) => async () => {
  await new Promise((r) => setTimeout(r, 20));
  throw new Error(message);
};

export const SubmitError: Story = {
  render: () => <ExerciseFormScreen mode="create" onCancel={noop} onSubmit={fail('Упражнение с таким названием уже есть')} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Название'), 'Мост');
    await userEvent.click(c.getByRole('button', { name: 'Создать' }));
    await expect(await c.findByRole('alert')).toHaveTextContent('Упражнение с таким названием уже есть');
    // форма не закрылась, значения на месте, кнопка снова доступна
    await expect(c.getByLabelText('Название')).toHaveValue('Мост');
    await expect(c.getByRole('button', { name: 'Создать' })).toBeEnabled();
  },
};
export const Submitting: Story = {
  render: () => <ExerciseFormScreen mode="create" onCancel={noop} onSubmit={() => new Promise<void>(() => {})} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText('Название'), 'Мост');
    await userEvent.click(c.getByRole('button', { name: 'Создать' }));
    const busy = await c.findByRole('button', { name: 'Сохраняем' });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute('aria-busy', 'true');
    await expect(c.getByRole('button', { name: 'Отмена' })).toBeDisabled();
  },
};
const onDeleteSpy = fn(async () => {});
export const EditDelete: Story = {
  render: () => <ExerciseFormScreen mode="edit" exercise={squat} onCancel={noop} onSubmit={noop} onDelete={onDeleteSpy} />,
  play: async ({ canvasElement }) => {
    onDeleteSpy.mockClear();
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Удалить упражнение' }));
    const dialog = await screen.findByRole('dialog', { name: 'Удалить упражнение?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(onDeleteSpy).not.toHaveBeenCalled();
    await userEvent.click(c.getByRole('button', { name: 'Удалить упражнение' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(onDeleteSpy).toHaveBeenCalledTimes(1));
  },
};
export const DeleteError: Story = {
  render: () => <ExerciseFormScreen mode="edit" exercise={squat} onCancel={noop} onSubmit={noop} onDelete={fail('Нет связи с сервером')} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Удалить упражнение' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить' }));
    await expect(await c.findByRole('alert')).toHaveTextContent('Нет связи с сервером');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  },
};
