import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ExerciseNameLink } from './ExerciseNameLink';

const meta = {
  title: 'UI/ExerciseNameLink',
  component: ExerciseNameLink,
  args: { name: 'Приседания со штангой', href: '/exercises/squat', onOpen: fn() },
  parameters: { docs: { description: { component: 'Название упражнения в списках: ссылка на карточку или обычный текст, если упражнения нет в библиотеке.' } } },
} satisfies Meta<typeof ExerciseNameLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = {
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Приседания со штангой' });
    await expect(link).toHaveAttribute('href', '/exercises/squat');
    await userEvent.click(link);
    await expect(args.onOpen).toHaveBeenCalledWith('/exercises/squat');
  },
};

export const NotInLibrary: Story = {
  args: { href: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('link')).toBeNull();
    await expect(canvas.getByText('Приседания со штангой')).toBeVisible();
  },
};
