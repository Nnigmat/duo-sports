import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { athletesFixture, TODAY } from '../fixtures';
import { AthleteHeader } from './AthleteHeader';

const meta = {
  title: 'Features/Trainer/AthleteHeader',
  component: AthleteHeader,
  args: { today: TODAY, athlete: athletesFixture[0]!, tab: 'sessions', backHref: '/trainer', onBack: fn(), onTab: fn() },
  parameters: { layout: 'padded', docs: { description: { component: 'Шапка карточки ученика с вкладками «Тренировки», «План» и «Замеры».' } } },
} satisfies Meta<typeof AthleteHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sessions: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const nav = within(c.getByRole('navigation', { name: 'Разделы карточки ученика' }));
    await expect(nav.getAllByRole('link')).toHaveLength(3);
    await expect(nav.getByRole('link', { name: 'Тренировки' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(nav.getByRole('link', { name: 'План' }));
    await expect(args.onTab).toHaveBeenCalledWith('plan');
  },
};

export const Measurements: Story = {
  args: { tab: 'measurements' },
  play: async ({ canvasElement, args }) => {
    const nav = within(within(canvasElement).getByRole('navigation', { name: 'Разделы карточки ученика' }));
    const tab = nav.getByRole('link', { name: 'Замеры' });
    await expect(tab).toHaveAttribute('aria-current', 'page');
    await expect(tab).toHaveAttribute('href', `/trainer/athletes/${athletesFixture[0]!.id}/measurements`);
    await expect(nav.getByRole('link', { name: 'Тренировки' })).not.toHaveAttribute('aria-current');
    await userEvent.click(nav.getByRole('link', { name: 'Тренировки' }));
    await expect(args.onTab).toHaveBeenCalledWith('sessions');
    await userEvent.click(tab);
    await expect(args.onTab).toHaveBeenCalledWith('measurements');
  },
};
