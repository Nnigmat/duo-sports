import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { SearchField } from './SearchField';

const meta = {
  title: 'UI/SearchField',
  component: SearchField,
  args: { label: 'Поиск по названию или мышце', placeholder: 'Поиск: присед, ягодицы…', value: '', onValueChange: () => {} },
  parameters: { docs: { description: { component: `Поиск на экране «Упражнения». ${ARTIFACT}` } } },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithText: Story = { args: { value: 'присед' } };

function Live(args: Story['args']) {
  const [value, setValue] = useState('');
  return <SearchField label="Поиск по названию или мышце" placeholder="Поиск: присед, ягодицы…" {...args} value={value} onValueChange={setValue} />;
}
export const Interactive: Story = {
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole('searchbox', { name: 'Поиск по названию или мышце' });
    await userEvent.type(input, 'жим');
    await expect(input).toHaveValue('жим');
    await userEvent.click(c.getByRole('button', { name: 'Очистить поиск' }));
    await expect(input).toHaveValue('');
    await expect(input).toHaveFocus();
  },
};
