import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../storyKit';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: { label: 'Применить к следующим кругам', hint: 'Подходы 4 и 7 этого упражнения' },
  argTypes: { checked: { control: 'boolean' }, disabled: { control: 'boolean' }, hint: { control: 'text' } },
  parameters: {
    docs: { description: { component: `Артборды «Изменить подход» и «Время — изменить» («Применить к следующим…»). ${ARTIFACT}` } },
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const box = c.getByRole('checkbox');
    await expect(box).not.toBeChecked();
    await userEvent.click(c.getByText('Применить к следующим кругам'));
    await expect(box).toBeChecked();
    await userEvent.click(c.getByText('Подходы 4 и 7 этого упражнения'));
    await expect(box).not.toBeChecked();
  },
};
export const Checked: Story = { args: { defaultChecked: true } };
export const NoHint: Story = { args: { hint: undefined } };
export const Focus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('checkbox')).toHaveFocus();
  },
};
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox');
    await userEvent.click(box);
    await expect(box).not.toBeChecked();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Checkbox label="Обычный" hint="Со второй строкой" />
      <Checkbox label="Отмечен" defaultChecked />
      <Checkbox label="Недоступный" hint="Нельзя изменить" disabled />
    </Stack>
  ),
};
