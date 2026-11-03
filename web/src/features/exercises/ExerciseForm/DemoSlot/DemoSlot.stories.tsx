import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DemoSlot } from './DemoSlot';

const meta = {
  title: 'Features/Exercises/DemoSlot',
  component: DemoSlot,
  args: { label: 'Девочка', onPick: fn(), onRemove: fn() },
  decorators: [(Story) => <div style={{ padding: 16, maxWidth: 320 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Слот ролика чибика в форме упражнения: превью, «Выбрать файл»/«Заменить», «Удалить». Файл выбирается настоящим input type=file, кнопка открывает выбор.' } } },
} satisfies Meta<typeof DemoSlot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Ролика нет')).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Удалить' })).toBeNull();
    const input = canvasElement.querySelector('input[type=file]') as HTMLInputElement;
    await expect(input).toHaveAttribute('accept', 'video/mp4,video/webm');
    const file = new File([new Uint8Array([1])], 'a.mp4', { type: 'video/mp4' });
    await userEvent.upload(input, file);
    await expect(args.onPick).toHaveBeenCalledWith(file);
  },
};

export const Filled: Story = {
  args: { src: 'data:video/mp4;base64,' },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Заменить' })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Удалить' }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};

export const Busy: Story = {
  args: { src: 'data:video/mp4;base64,', busy: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button', { name: 'Загружаем' })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Удалить' })).toBeDisabled();
  },
};

export const Failed: Story = {
  args: { error: 'Видео слишком большое' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Видео слишком большое')).toBeVisible();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Выбрать файл' })).toBeDisabled();
  },
};
