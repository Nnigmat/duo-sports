import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { CommentField } from './CommentField';

const meta = {
  title: 'UI/CommentField',
  component: CommentField,
  args: { value: '', onChange: fn(), onSubmit: fn(), label: 'Ответ тренеру', placeholder: 'Ответить тренеру' },
  decorators: [(Story) => <div style={{ maxWidth: 358 }}><Story /></div>],
  parameters: { docs: { description: { component: `Поле комментария: авто-высота до 4 строк, отправка, привязка к моменту видео. ${ARTIFACT}` } } },
} satisfies Meta<typeof CommentField>;
export default meta;
type Story = StoryObj<typeof meta>;

function Live(args: React.ComponentProps<typeof CommentField>) {
  const [value, setValue] = useState(args.value);
  const [attached, setAttached] = useState(args.attached ?? false);
  const [sent, setSent] = useState(0);
  return (
    <div>
      <CommentField {...args} value={value} onChange={setValue} attached={attached} onAttachedChange={setAttached} onSubmit={() => { setSent((n) => n + 1); setValue(''); }} />
      <output style={{ fontSize: 12 }}>Отправлено: {sent}</output>
    </div>
  );
}

export const Default: Story = {
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const send = c.getByRole('button', { name: 'Отправить' });
    await expect(send).toBeDisabled();
    await expect(send.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    await userEvent.type(c.getByLabelText('Ответ тренеру'), 'Понял, попробую');
    await expect(send).toBeEnabled();
    await userEvent.click(send);
    await expect(c.getByText('Отправлено: 1')).toBeInTheDocument();
    await expect(c.getByLabelText('Ответ тренеру')).toHaveValue('');
  },
};
export const WithTimecode: Story = {
  args: { timecodeSec: 18 },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole('button', { name: 'К моменту 0:18' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  },
};
export const Attached: Story = { args: { timecodeSec: 18, attached: true, value: 'Здесь колени внутрь' } };
export const GrowsToFourLines: Story = {
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const ta = within(canvasElement).getByLabelText('Ответ тренеру');
    const h1 = ta.getBoundingClientRect().height;
    await userEvent.type(ta, '1{enter}2{enter}3{enter}4{enter}5{enter}6');
    const h2 = ta.getBoundingClientRect().height;
    await expect(h2).toBeGreaterThan(h1);
    await expect(h2).toBeLessThan(21 * 6);
  },
};
export const LongText: Story = { args: { value: 'Очень длинный текст комментария. '.repeat(10) } };
export const Sending: Story = {
  args: { value: 'Отправляю', sending: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Отправляем' })).toBeDisabled();
  },
};
export const WithError: Story = {
  args: { value: 'Не ушло', error: 'Не удалось отправить. Попробуй ещё раз.' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('Не удалось отправить');
  },
};
export const Disabled: Story = { args: { disabled: true, timecodeSec: 18, value: 'Нельзя' } };
