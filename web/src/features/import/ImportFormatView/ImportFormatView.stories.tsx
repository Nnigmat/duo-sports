import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SECTIONS } from '../format';
import { ImportFormatView } from './ImportFormatView';

const meta = {
  title: 'Features/Import/ImportFormatView',
  component: ImportFormatView,
  args: { onCopyExample: fn(), importHref: '/import' },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Артборд «Импорт · Описание формата»: содержание, пример, таблицы полей, блоки, единицы, повторный импорт и ошибки.' } } },
} satisfies Meta<typeof ImportFormatView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Формат импорта' })).toBeVisible();
    const toc = within(c.getByRole('navigation', { name: 'Содержание' }));
    await expect(toc.getAllByRole('link')).toHaveLength(SECTIONS.length);
    // Каждый пункт содержания ведёт на существующий раздел
    for (const s of SECTIONS) await expect(canvasElement.querySelector(`#${s.id}`)).not.toBeNull();
    await expect(c.getByRole('link', { name: 'К импорту' })).toHaveAttribute('href', '/import');
    await userEvent.click(c.getByRole('button', { name: 'Скопировать пример' }));
    await expect(args.onCopyExample).toHaveBeenCalledWith(expect.stringMatching(/^version: 1\n/));
  },
};

export const Blocks: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('type: circuit')).toBeVisible();
    await expect(c.getByText('type: warmup | cooldown')).toBeVisible();
    await expect(c.getByText('Ошибки и ограничения')).toBeVisible();
  },
};

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
