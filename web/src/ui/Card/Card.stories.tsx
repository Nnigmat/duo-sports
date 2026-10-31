import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../storyKit';
import { Text } from '../Text/Text';
import { Card } from './Card';

const body = (
  <>
    <Text variant="eyebrow">Разминка</Text>
    <Text variant="body" tag="span">6 упражнений по 30 с</Text>
  </>
);

const meta = {
  title: 'UI/Card',
  component: Card,
  args: { children: body, tone: 'canvas' },
  argTypes: { tone: { control: 'inline-radio', options: ['canvas', 'surface'] } },
  parameters: { docs: { description: { component: `Артборд «Старт тренировки» (canvas + hairline-soft, surface + hairline). ${ARTIFACT}` } } },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Surface: Story = { args: { tone: 'surface' } };

export const AsLink: Story = {
  args: { href: '#card' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link').tagName).toBe('A');
  },
};

export const AsButton: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Focus: Story = {
  args: { href: '#card' },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('link')).toHaveFocus();
  },
};

export const AllVariants: Story = {
  render: () => (
    <Stack>
      <Card>{body}</Card>
      <Card tone="surface">{body}</Card>
      <Card href="#card">{body}</Card>
      <Card onClick={() => {}}>{body}</Card>
    </Stack>
  ),
};
