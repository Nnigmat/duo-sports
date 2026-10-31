import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT, Row, Stack } from '../storyKit';
import { TextInput } from './TextInput';

const meta = {
  title: 'UI/TextInput',
  component: TextInput,
  args: { label: 'Имя', placeholder: 'Например, Анна', hint: 'Как к вам обращаться' },
  argTypes: { disabled: { control: 'boolean' }, error: { control: 'text' }, hint: { control: 'text' } },
  parameters: {
    docs: { description: { component: `В макете отдельного текстового поля нет; рамка hairline-strong и высота 44 px — по токенам, лейбл и подсказка как в «Изменить подход». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof TextInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Имя');
    await userEvent.type(input, 'Анна');
    await expect(input).toHaveValue('Анна');
  },
};
export const Filled: Story = { args: { defaultValue: 'Анна' } };
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByLabelText('Имя')).toHaveFocus();
  },
};
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Только чтение' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Имя')).toBeDisabled();
  },
};
export const WithError: Story = {
  args: { defaultValue: 'an', error: 'Минимум 3 символа', hint: undefined },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Имя');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Минимум 3 символа');
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Row label="обычное"><TextInput label="Имя" placeholder="Например, Анна" hint="Подсказка" /></Row>
      <Row label="disabled"><TextInput label="Имя" defaultValue="Только чтение" disabled /></Row>
      <Row label="ошибка"><TextInput label="Логин" defaultValue="an" error="Минимум 3 символа" /></Row>
    </Stack>
  ),
};
