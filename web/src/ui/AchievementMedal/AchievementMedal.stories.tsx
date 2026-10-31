import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { icons, type IconName } from '../Icon/icons';
import { Row, Stack } from '../storyKit';
import { AchievementMedal } from './AchievementMedal';

const meta = {
  title: 'UI/AchievementMedal',
  component: AchievementMedal,
  args: { icon: 'flame', tier: 1, size: 56, label: 'Без пропусков' },
  argTypes: {
    icon: { control: 'select', options: Object.keys(icons) as IconName[] },
    tier: { control: 'inline-radio', options: [0, 1, 2, 3] },
    size: { control: 'inline-radio', options: [40, 56, 72] },
  },
} satisfies Meta<typeof AchievementMedal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName('Без пропусков, уровень I');
  },
};
export const NotEarned: Story = {
  args: { tier: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toHaveAccessibleName('Без пропусков, ещё не получено');
  },
};
export const Streak: Story = { args: { tier: 2, streak: true } };

export const AllVariants: Story = {
  render: () => (
    <Stack>
      {([40, 56, 72] as const).map((size) => (
        <Row key={size} label={`${size} px`}>
          {([0, 1, 2, 3] as const).map((tier) => (
            <AchievementMedal key={tier} icon="trophy" tier={tier} size={size} label="Награда" />
          ))}
          {([1, 2, 3] as const).map((tier) => (
            <AchievementMedal key={`s${tier}`} icon="flame" tier={tier} size={size} streak label="Серия" />
          ))}
        </Row>
      ))}
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('img')).toHaveLength(21);
    await expect(c.getAllByRole('img', { name: 'Серия, уровень III' })).toHaveLength(3);
  },
};
