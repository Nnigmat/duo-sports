import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT } from '../storyKit';
import { Button } from '../Button/Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: { title: 'Ничего не нашлось', description: 'Попробуйте другое название или сбросьте фильтр.' },
  decorators: [(Story) => <div style={{ maxWidth: 390 }}><Story /></div>],
  parameters: { docs: { description: { component: `Пустые состояния списка упражнений и карточки. ${ARTIFACT}` } } },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = { args: { action: <Button variant="secondary">Сбросить фильтры</Button> } };
export const NoHistory: Story = {
  args: {
    title: 'Ещё не выполнялось',
    description: 'Добавьте упражнение в тренировку. После первого подхода здесь появятся рекорд, подходы и график.',
  },
};
