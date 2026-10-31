import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import type { Pose } from '../../../../../shared/types';
import { ARTIFACT } from '../../../ui/storyKit';
import { Chibi } from './Chibi';
import { POSES } from './poseFor';

const meta = {
  title: 'Features/Workout/Chibi',
  component: Chibi,
  args: { pose: 'dips', size: 300 },
  argTypes: {
    pose: { control: 'select', options: POSES },
    size: { control: { type: 'range', min: 64, max: 400, step: 4 } },
  },
  parameters: {
    docs: {
      description: {
        component: `Персонаж-чибик: одна поза — одна петля движения, светятся рабочие мышцы. Плейсхолдер до финальной анимации. С prefers-reduced-motion движение отключено. Артборды «Chibi» и «Позы и эмоции персонажа». ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof Chibi>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName(/обратные отжимания/);
  },
};

const GALLERY: Array<{ pose: Pose; title: string; note: string }> = [
  { pose: 'stand', title: 'Старт', note: 'neutral' },
  { pose: 'headroll', title: 'Вращения головой', note: 'разминка' },
  { pose: 'shoulders', title: 'Вращения плечами', note: 'разминка' },
  { pose: 'dips', title: 'Обратные отжимания', note: 'focus · трицепс' },
  { pose: 'scissors', title: 'Ножницы', note: 'focus · пресс' },
  { pose: 'lunge', title: 'Выпады', note: 'focus · бёдра' },
  { pose: 'squat', title: 'Приседания с гантелью', note: 'повторы + вес' },
  { pose: 'plank', title: 'Планка', note: 'на время' },
  { pose: 'rest', title: 'Отдых', note: 'tired · пьёт воду' },
  { pose: 'camera', title: 'Камера', note: 'круг с записью' },
  { pose: 'stretch', title: 'Растяжка', note: 'заминка' },
  { pose: 'cheer', title: 'Финиш', note: 'cheer · фантики' },
  { pose: 'wave', title: 'Приветствие', note: 'wave · экран «Сегодня»' },
];

export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--spacing-xl)' }}>
      {GALLERY.map((g) => (
        <figure key={g.pose} style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <div style={{ width: 160, height: 160, borderRadius: 'var(--rounded-full)', background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
            <Chibi pose={g.pose} size={160} />
          </div>
          <figcaption style={{ textAlign: 'center', fontWeight: 500 }}>{g.title}</figcaption>
          <span style={{ fontSize: 'var(--caption-size)', color: 'var(--steel)' }}>{g.note}</span>
        </figure>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('img')).toHaveLength(13);
  },
};

export const Wave: Story = {
  args: { pose: 'wave' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName('Персонаж машет рукой');
  },
};

export const WithMedal: Story = {
  args: { pose: 'wave', medal: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName('Персонаж машет рукой, на груди медаль');
  },
};
