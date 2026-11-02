import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { BLOCK_TYPES, EXAMPLE } from '../format';
import { CodeBlock } from './CodeBlock';

const meta = {
  title: 'Features/Import/CodeBlock',
  component: CodeBlock,
  args: { lines: EXAMPLE, label: 'Пример YAML', numbered: true },
  parameters: { docs: { description: { component: 'Артборд «Импорт · Описание формата»: блок кода с нумерацией и приглушёнными комментариями.' } } },
} satisfies Meta<typeof CodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  args: { onCopy: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText('Пример YAML')).toHaveAttribute('tabindex', '0');
    await userEvent.click(c.getByRole('button', { name: 'Скопировать пример' }));
    await expect(args.onCopy).toHaveBeenCalledWith(expect.stringMatching(/^version: 1\n[\s\S]+\n$/));
    await expect(c.getByRole('button', { name: 'Скопировано' })).toBeVisible();
  },
};

export const Snippet: Story = { args: { lines: BLOCK_TYPES[1]!.code, label: 'Блок circuit', numbered: false } };
