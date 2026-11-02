import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { athletesFixture, countsFixture, TODAY } from '../fixtures';
import type { AthleteFilter } from '../students';
import { StudentsView } from './StudentsView';

const onOpenAthlete = fn();

const meta = {
  title: 'Features/Trainer/StudentsView',
  component: StudentsView,
  args: {
    today: TODAY,
    athletes: athletesFixture,
    counts: countsFixture,
    filter: 'all',
    onFilterChange: fn(),
    query: '',
    onQueryChange: fn(),
    athleteHref: (id: number) => `/trainer/athletes/${id}`,
    onOpenAthlete,
  },
  beforeEach: () => {
    onOpenAthlete.mockReset();
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Список учеников тренера. Артборд «Тренер · Ученики». Фильтр и поиск считает сервер: экран только показывает результат.' } } },
} satisfies Meta<typeof StudentsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Ученики' })).toBeVisible();
    await expect(c.getByText('3 ученика · 1 ждёт разбора')).toBeVisible();
    await expect(c.getByText(/^2\sвидео ждут разбора$/)).toBeVisible();
    await expect(c.getByText(/^11\sдней без тренировок$/)).toBeVisible();
    await expect(c.getByText('Всё по плану')).toBeVisible();
    await expect(c.getByText('Цель не задана')).toBeVisible();
    await expect(c.getByRole('progressbar', { name: 'Никита Н.: 4 из 4 тренировок за 7 дней' })).toBeVisible();
    await expect(c.getByRole('button', { name: /Ждут разбора/ })).toHaveAttribute('aria-pressed', 'false');
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

export const OpenAthlete: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('link', { name: /Никита Н\./ }));
    await expect(onOpenAthlete).toHaveBeenCalledWith(1);
  },
};

export const Touch44: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const targets = [...c.getAllByRole('button'), ...c.getAllByRole('link'), c.getByRole('searchbox')];
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      await expect(r.height).toBeGreaterThanOrEqual(44);
      await expect(r.width).toBeGreaterThanOrEqual(44);
    }
  },
};

/** Фильтр и поиск живые: проверяем, что экран шлёт значения наверх */
export const FilterAndSearch: Story = {
  render: (args) => {
    const [filter, setFilter] = useState<AthleteFilter>('all');
    const [query, setQuery] = useState('');
    return (
      <StudentsView
        {...args}
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f);
          args.onFilterChange(f);
        }}
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          args.onQueryChange(q);
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Пропадают/ }));
    await expect(args.onFilterChange).toHaveBeenLastCalledWith('inactive');
    await expect(c.getByRole('button', { name: /Пропадают/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(c.getByRole('searchbox', { name: 'Поиск по ученикам' }), 'Ал');
    await expect(args.onQueryChange).toHaveBeenLastCalledWith('Ал');
    await userEvent.click(c.getByRole('button', { name: 'Очистить поиск' }));
    await expect(args.onQueryChange).toHaveBeenLastCalledWith('');
  },
};

export const OnlyReview: Story = { args: { filter: 'review', athletes: athletesFixture.slice(0, 1) } };

export const EmptyFilter: Story = {
  args: { filter: 'review', athletes: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Разбирать нечего')).toBeVisible();
  },
};

export const NothingFound: Story = {
  args: { query: 'Ян', athletes: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Никого не нашли')).toBeVisible();
  },
};

export const NoAthletes: Story = {
  args: { athletes: [], counts: { all: 0, review: 0, inactive: 0, ok: 0 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Ни одного ученика не добавлено')).toBeVisible();
  },
};
