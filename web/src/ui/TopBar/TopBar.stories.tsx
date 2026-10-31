import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT } from '../storyKit';
import { Button } from '../Button/Button';
import { TopBar } from './TopBar';

const meta = {
  title: 'UI/TopBar',
  component: TopBar,
  decorators: [(Story) => <div style={{ maxWidth: 390, border: '1px solid var(--hairline)' }}><Story /></div>],
  parameters: { docs: { description: { component: `Шапка карточки упражнения и формы. ${ARTIFACT}` } } },
} satisfies Meta<typeof TopBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BackAndEdit: Story = {
  args: {
    start: <Button variant="ghost" compact icon="back">Упражнения</Button>,
    end: <Button variant="ghost" compact icon="pencil">Редактировать</Button>,
  },
};
export const CancelAndSave: Story = {
  args: {
    start: <Button variant="ghost" compact>Отмена</Button>,
    end: <Button variant="ghost" compact>Сохранить</Button>,
  },
};
