import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { TextArea } from './TextArea';

const meta = {
  title: 'UI/TextArea',
  component: TextArea,
  args: { label: 'Как выполнять', hint: 'Один шаг на строку' },
  parameters: { docs: { description: { component: 'Многострочное поле на тех же токенах, что TextInput.' } } },
} satisfies Meta<typeof TextArea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Как выполнять');
    await userEvent.type(input, 'Встаньте прямо{enter}Опуститесь вниз');
    await expect(input).toHaveValue('Встаньте прямо\nОпуститесь вниз');
    await expect(input).toHaveAccessibleDescription('Один шаг на строку');
  },
};
export const WithError: Story = {
  args: { error: 'Слишком длинный текст', hint: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Как выполнять')).toHaveAttribute('aria-invalid', 'true');
  },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Только чтение' } };
