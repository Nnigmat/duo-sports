import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT } from '../storyKit';
import { CommentBubble } from './CommentBubble';

const meta = {
  title: 'UI/CommentBubble',
  component: CommentBubble,
  args: { author: 'Анна', date: '12 окт', text: 'Колени держите по линии носков, спину ровно. На подъёме не торопитесь.' },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `Комментарий тренера к упражнению. ${ARTIFACT}` } } },
} satisfies Meta<typeof CommentBubble>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoDate: Story = { args: { date: undefined } };
