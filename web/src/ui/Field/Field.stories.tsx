import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import inputStyles from '../TextInput/TextInput.module.css';
import { Field } from './Field';

const meta = {
  title: 'UI/Field',
  component: Field,
  args: {
    label: 'Название',
    hint: 'Как это увидят другие',
    // Field оборачивает любой контрол; для истории берём стили настоящего поля
    children: ({ id, labelId: _l, ...a11y }) => (
      <input id={id} {...a11y} className={`${inputStyles.input} ${a11y['aria-invalid'] ? inputStyles.invalid : ''}`} />
    ),
  },
  argTypes: { label: { control: 'text' }, hint: { control: 'text' }, error: { control: 'text' } },
  parameters: {
    docs: { description: { component: `Артборд «Изменить подход» (лейбл 13/600 slate сверху, подсказка caption steel снизу). Ошибка: иконка и текст ink. ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithError: Story = {
  args: { error: 'Заполните поле' },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Название');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Заполните поле');
  },
};
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByLabelText('Название')).toHaveFocus();
  },
};
