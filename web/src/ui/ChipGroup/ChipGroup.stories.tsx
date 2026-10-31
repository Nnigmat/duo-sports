import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { Chip } from '../Chip/Chip';
import { ChipGroup } from './ChipGroup';

const meta = {
  title: 'UI/ChipGroup',
  component: ChipGroup,
  args: { label: 'Группы мышц', children: null },
  parameters: { docs: { description: { component: `Фильтры по группам мышц (с числом) и выбор мышц/снаряда в форме. ${ARTIFACT}` } } },
} satisfies Meta<typeof ChipGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const groups = [
  ['Все', 24],
  ['Ноги', 8],
  ['Спина', 5],
  ['Грудь', 4],
  ['Плечи', 3],
  ['Корпус', 4],
] as const;

function Filters({ scroll }: { scroll?: boolean }) {
  const [active, setActive] = useState('Все');
  return (
    <ChipGroup label="Группы мышц" scroll={scroll}>
      {groups.map(([name, count]) => (
        <Chip key={name} pressed={active === name} count={count} onClick={() => setActive(name)}>
          {name}
        </Chip>
      ))}
    </ChipGroup>
  );
}

export const WithCounts: Story = {
  render: () => <Filters />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole('group', { name: 'Группы мышц' });
    await userEvent.click(within(group).getByRole('button', { name: /Ноги/ }));
    await expect(within(group).getByRole('button', { name: /Ноги/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(within(group).getByRole('button', { name: /Все/ })).toHaveAttribute('aria-pressed', 'false');
  },
};
export const Scrolling: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <Filters scroll />
    </div>
  ),
};
