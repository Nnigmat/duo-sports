import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ChoiceCard } from './ChoiceCard';

const meta = {
  title: 'UI/ChoiceCard',
  component: ChoiceCard,
  args: { name: 'move', value: 'a', checked: false, onChange: () => {}, title: 'Перенести на другой день', description: 'Остальные тренировки недели не двигаются' },
} satisfies Meta<typeof ChoiceCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('radio', { name: /Перенести на другой день/ })).not.toBeChecked();
  },
};
export const Checked: Story = { args: { checked: true } };
export const NoDescription: Story = { args: { description: undefined } };
export const Disabled: Story = { args: { disabled: true } };

function Group() {
  const [v, setV] = useState('a');
  const opts = [
    { value: 'a', title: 'Только эту тренировку', description: 'Остальная неделя без изменений' },
    { value: 'b', title: 'Сдвинуть всю неделю' },
  ];
  return (
    <div role="radiogroup" aria-label="Что переносим" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', maxWidth: 360 }}>
      {opts.map((o) => (
        <ChoiceCard key={o.value} name="scope" checked={v === o.value} onChange={setV} {...o} />
      ))}
    </div>
  );
}

export const AllVariants: Story = {
  render: () => <Group />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('radio', { name: /Только эту тренировку/ })).toBeChecked();
    await userEvent.click(c.getByRole('radio', { name: 'Сдвинуть всю неделю' }));
    await expect(c.getByRole('radio', { name: 'Сдвинуть всю неделю' })).toBeChecked();
    await expect(c.getByRole('radio', { name: /Только эту тренировку/ })).not.toBeChecked();
  },
};

export const WithIcon: Story = { args: { icon: 'kettlebell', title: 'Вес × повторы', description: 'Штанга, гантели, гири' } };
