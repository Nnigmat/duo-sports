import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ARTIFACT, Stack } from '../../../ui/storyKit';
import { PasswordStrength } from './PasswordStrength';

const meta = {
  title: 'Features/Auth/PasswordStrength',
  component: PasswordStrength,
  args: { strength: 2 },
  argTypes: { strength: { control: 'inline-radio', options: [0, 1, 2, 3, 4] } },
  parameters: { docs: { description: { component: `Артборд «Десктоп · Смена пароля» (полоска из четырёх сегментов и подпись). Уровень назван словом. ${ARTIFACT}` } } },
} satisfies Meta<typeof PasswordStrength>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('средний')).toBeVisible();
  },
};
export const Weak: Story = { args: { strength: 1 } };
export const Strong: Story = { args: { strength: 4 } };
export const Empty: Story = {
  args: { strength: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toBe('');
  },
};
export const AllVariants: Story = {
  render: () => (
    <Stack>
      {([1, 2, 3, 4] as const).map((s) => (
        <PasswordStrength key={s} strength={s} />
      ))}
    </Stack>
  ),
};
