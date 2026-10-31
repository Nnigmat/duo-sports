import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../storyKit';
import { IconButton } from './IconButton';

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  args: { icon: 'playCircle', 'aria-label': 'Техника', caption: 'Техника', size: 'sm', onClick: fn() },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: 'select', options: ['playCircle', 'camera', 'pencil', 'skip', 'check', 'play', 'back', 'close'] },
    bare: { control: 'boolean' },
    badge: { control: 'boolean' },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: `Артборды «Экран тренировки» (sm 48, md 56, lg 88, badge, active) и «Старт тренировки» / «Тренировка завершена» (прозрачная кнопка шапки). ${ARTIFACT}`,
      },
    },
  },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Medium: Story = { args: { size: 'md', icon: 'pencil', 'aria-label': 'Изменить', caption: 'Изменить' } };
export const Large: Story = { args: { size: 'lg', icon: 'check', 'aria-label': 'Готово', caption: 'Готово' } };
export const Bare: Story = { args: { bare: true, icon: 'back', 'aria-label': 'Назад', caption: undefined } };
export const Active: Story = { args: { active: true, icon: 'camera', 'aria-label': 'Запись', caption: 'Запись' } };
export const WithBadge: Story = { args: { badge: true, 'aria-label': 'Техника, есть новое' } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button')).toHaveFocus();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="sm 48">
        <IconButton icon="playCircle" aria-label="Техника" caption="Техника" />
        <IconButton icon="playCircle" aria-label="Техника, есть новое" caption="Техника" badge />
        <IconButton icon="camera" aria-label="Запись" caption="Запись" active />
        <IconButton icon="camera" aria-label="Запись недоступна" caption="Запись" disabled />
      </Row>
      <Row label="md 56">
        <IconButton size="md" icon="pencil" aria-label="Изменить" caption="Изменить" />
        <IconButton size="md" aria-label="Плюс 15 секунд" caption="+15 с">
          +15
        </IconButton>
        <IconButton size="md" icon="skip" aria-label="Пропустить" caption="Пропустить" />
      </Row>
      <Row label="lg 88">
        <IconButton size="lg" icon="check" aria-label="Готово" caption="Готово" />
        <IconButton size="lg" icon="play" aria-label="Старт" caption="Старт" />
      </Row>
      <Row label="шапка, без рамки">
        <IconButton bare icon="back" aria-label="Назад" />
        <IconButton bare icon="close" aria-label="Закрыть" />
      </Row>
    </Stack>
  ),
};
