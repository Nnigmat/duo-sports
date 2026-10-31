import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT } from '../storyKit';
import { MediaLink } from './MediaLink';

const meta = {
  title: 'UI/MediaLink',
  component: MediaLink,
  args: { href: '#video', duration: '0:24', eyebrow: 'Последнее видео · 12 окт', title: 'Приседания, круг 2' },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `Видео в карточке и в истории упражнения. ${ARTIFACT}` } } },
} satisfies Meta<typeof MediaLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongTitle: Story = { args: { title: 'Приседания со штангой, круг 2, вид сбоку, вторая попытка' } };
