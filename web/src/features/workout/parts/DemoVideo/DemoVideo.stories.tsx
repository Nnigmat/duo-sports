import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { DemoVideo } from './DemoVideo';
import sample from './sample.mp4';

const meta = {
  title: 'Features/Workout/DemoVideo',
  component: DemoVideo,
  args: { src: '/demo-missing.mp4', onFail: fn() },
  decorators: [(Story) => <div style={{ padding: 16, width: 360 }}><Story /></div>],
  parameters: { docs: { description: { component: 'Ролик чибика на экране тренировки: без звука, зациклен, запускается сам. Если файл не загрузился, вызывается onFail и экран возвращает статичного чибика.' } } },
} satisfies Meta<typeof DemoVideo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {
  args: { src: sample },
  play: async ({ canvasElement, args }) => {
    const video = canvasElement.querySelector('video') as HTMLVideoElement;
    await expect(video.muted).toBe(true);
    await expect(video.loop).toBe(true);
    await expect(video).toHaveAttribute('playsinline');
    await expect(args.onFail).not.toHaveBeenCalled();
  },
};

export const MissingFile: Story = {
  play: async ({ args }) => {
    await new Promise((r) => setTimeout(r, 300));
    await expect(args.onFail).toHaveBeenCalled();
  },
};
