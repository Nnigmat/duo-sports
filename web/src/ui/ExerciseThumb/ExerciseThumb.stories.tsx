import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test';
import { ExerciseThumb } from './ExerciseThumb';

const meta = {
  title: 'UI/ExerciseThumb',
  component: ExerciseThumb,
  globals: { viewport: { value: 'a15', isRotated: false } },
  args: { name: 'Жим лёжа' },
  parameters: { docs: { description: { component: 'Превью ролика техники рядом с упражнением: первый кадр или заглушка. По нажатию ролик открывается в панели.' } } },
} satisfies Meta<typeof ExerciseThumb>;
export default meta;
type Story = StoryObj<typeof meta>;

// В Storybook нет /api/demo: путь выходит на ролик чибика из web/assets, который отдаёт сервер разработки
const REAL = '../../web/assets/characters/idle-girl.mp4';

export const WithVideo: Story = {
  args: { file: REAL },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const thumb = c.getByRole('button', { name: /^Видео техники: Жим лёжа/ });
    expect(thumb.querySelector('video')).not.toBeNull();
    await userEvent.click(thumb);
    const sheet = await screen.findByRole('dialog', { name: 'Жим лёжа' });
    expect(sheet.querySelector('video')).not.toBeNull();
    expect(c.queryByText('Нет видео')).toBeNull();
  },
};

export const NoVideo: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    expect(c.getByText('Нет видео')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: /^Видео техники: Жим лёжа/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Жим лёжа' });
    expect(within(sheet).getByText('Видео техники не добавлено')).toBeVisible();
  },
};

export const BrokenFile: Story = {
  args: { file: 'missing.mp4' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const video = c.getByRole('button', { name: /^Видео техники: Жим лёжа/ }).querySelector('video');
    if (video) fireEvent.error(video);
    await waitFor(() => expect(c.getByText('Нет видео')).toBeVisible());
  },
};
