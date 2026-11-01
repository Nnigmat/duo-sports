import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Button } from '../Button/Button';
import { ARTIFACT, Stack } from '../storyKit';
import { Notice } from './Notice';

const meta = {
  title: 'UI/Notice',
  component: Notice,
  args: { tone: 'info', children: 'Копия появится: вторник, 3 ноября.' },
  argTypes: { tone: { control: 'inline-radio', options: ['info', 'warn', 'success', 'error'] } },
  parameters: { docs: { description: { component: `Артборд «Десктоп · План — копия тренировки» (предупреждение и плашка «скопирована»). ${ARTIFACT}` } } },
} satisfies Meta<typeof Notice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Копия появится');
  },
};
export const Warn: Story = {
  args: { tone: 'warn', children: 'На 3 ноября уже запланировано «Верх тела». Копия её заменит.' },
};
export const ErrorTone: Story = {
  args: { tone: 'error', children: 'Неверный email или пароль. Проверьте раскладку и Caps Lock.' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Неверный email или пароль');
  },
};
export const SuccessWithAction: Story = {
  args: {
    tone: 'success',
    children: '«Ноги и ягодицы» скопирована на вторник, 3 ноября.',
    action: <Button variant="secondary" compact>Открыть день</Button>,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Открыть день' })).toBeVisible();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Notice>Выбери дату с 31 октября по 31 декабря.</Notice>
      <Notice tone="warn">На 3 ноября уже запланировано «Верх тела». Копия её заменит.</Notice>
      <Notice tone="success">«Ноги и ягодицы» скопирована на 3 ноября.</Notice>
    </Stack>
  ),
};
