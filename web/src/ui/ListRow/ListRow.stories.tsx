import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ARTIFACT } from '../storyKit';
import { Badge } from '../Badge/Badge';
import { ListRow } from './ListRow';

const meta = {
  title: 'UI/ListRow',
  component: ListRow,
  args: { icon: 'kettlebell', title: 'Приседания со штангой', subtitle: 'Ноги · ягодицы · штанга', onClick: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 390, border: '1px solid var(--hairline)' }}><Story /></div>],
  parameters: { docs: { description: { component: `Строка списка упражнений. ${ARTIFACT}` } } },
} satisfies Meta<typeof ListRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Приседания/ }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
export const WithRecord: Story = { args: { meta: <span>Рекорд · 60 кг × 10</span> } };
export const New: Story = {
  args: { title: 'Болгарские выпады', meta: <><Badge tone="highlight">Новое</Badge><span>Ещё не выполнялось</span></> },
};
export const AsLink: Story = { args: { onClick: undefined, href: '#detail' } };
