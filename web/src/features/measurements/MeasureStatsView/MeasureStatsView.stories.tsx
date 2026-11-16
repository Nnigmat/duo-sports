import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MEASUREMENT_KINDS } from '../../../../../shared/measurements';
import type { MeasurementEntry } from '../../../../../shared/types';
import { measurementsFixture } from '../../../data/fixtures';
import { ARTIFACT } from '../../../ui/storyKit';
import { MEASUREMENT_FIELDS } from '../measurements';
import { useMeasureStatsState } from '../useMeasureStatsState';
import { MeasureStatsView } from './MeasureStatsView';

function Interactive(props: { entries: MeasurementEntry[]; trainer?: boolean; tab?: boolean; onAdd?: () => void }) {
  const state = useMeasureStatsState();
  return (
    <MeasureStatsView
      today="2026-11-14"
      entries={props.entries}
      {...state}
      onBack={props.trainer || props.tab ? undefined : () => {}}
      titled={props.tab}
      onAdd={props.trainer ? undefined : props.onAdd}
    />
  );
}

const entries = measurementsFixture.entries;
/** Икры появились только в двух последних замерах */
const withCalf: MeasurementEntry[] = entries.map((e, i) =>
  i < entries.length - 2 ? e : { date: e.date, values: { ...e.values, calf: i === entries.length - 2 ? 35 : 35.5 } },
);

const list = (el: HTMLElement) => within(within(el).getByRole('group', { name: 'Показатели' }));
const row = (el: HTMLElement, label: string) => list(el).getByRole('button', { name: new RegExp(`^${label}`) });
const rows = (el: HTMLElement) => MEASUREMENT_FIELDS.map((f) => row(el, f.label));

const meta = {
  title: 'Features/Measurements/MeasureStatsView',
  component: MeasureStatsView,
  args: {
    today: '2026-11-14',
    entries,
    visible: [...MEASUREMENT_KINDS],
    period: 'all',
    mode: 'percent',
    point: null,
    onVisible: fn(),
    onPeriod: fn(),
    onMode: fn(),
    onPoint: fn(),
    onBack: fn(),
    onAdd: fn(),
  },
  render: () => <Interactive entries={entries} onAdd={() => {}} />,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: `Экран «Прогресс по замерам»: общий график изменений и список показателей. ${ARTIFACT}` } },
  },
} satisfies Meta<typeof MeasureStatsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const card = c.getByRole('region', { name: 'Изменение с 5 сентября' });
    await expect(within(card).getByText('14 ноября')).toBeVisible();
    await expect(within(card).getByRole('group', { name: 'Изменение показателей с 5 сентября по 14 ноября' })).toBeVisible();
    const all = rows(canvasElement);
    await expect(all).toHaveLength(8);
    for (const r of all) await expect(r).toHaveAttribute('aria-pressed', 'true');
    await expect(list(canvasElement).getByText('Показатели · 8 из 8')).toBeVisible();
    const waist = within(row(canvasElement, 'Талия'));
    await expect(waist.getByText('80,5 см')).toBeVisible();
    await expect(waist.getByText('−4,2 %')).toBeVisible();
    await expect(within(row(canvasElement, 'Икры')).getAllByText('—')).toHaveLength(2);
    await expect(canvasElement.textContent).not.toMatch(/NaN|Infinity/);
  },
};

export const Units: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('tab', { name: 'кг, см' }));
    await expect(c.getByRole('tab', { name: 'кг, см' })).toHaveAttribute('aria-selected', 'true');
    await expect(within(row(canvasElement, 'Талия')).getByText('−3,5 см')).toBeVisible();
    await expect(within(row(canvasElement, 'Вес')).getByText('−2,2 кг')).toBeVisible();
  },
};

export const ClearAndAll: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const l = list(canvasElement);
    await expect(l.getByRole('button', { name: 'Все' })).toBeDisabled();
    await userEvent.click(l.getByRole('button', { name: 'Очистить' }));
    for (const r of rows(canvasElement)) await expect(r).toHaveAttribute('aria-pressed', 'false');
    await expect(l.getByText('Показатели · 0 из 8')).toBeVisible();
    await expect(l.getByRole('button', { name: 'Очистить' })).toBeDisabled();
    await expect(c.getByText('Выберите показатели в списке')).toBeVisible();
    await expect(c.queryByRole('group', { name: /^Изменение показателей/ })).toBeNull();

    await userEvent.click(l.getByRole('button', { name: 'Все' }));
    await expect(l.getByText('Показатели · 8 из 8')).toBeVisible();
    await expect(c.queryByText('Выберите показатели в списке')).toBeNull();
    await expect(c.getByRole('group', { name: /^Изменение показателей/ })).toBeVisible();

    await userEvent.click(row(canvasElement, 'Рука'));
    await expect(row(canvasElement, 'Рука')).toHaveAttribute('aria-pressed', 'false');
    await expect(l.getByText('Показатели · 7 из 8')).toBeVisible();
    for (const r of rows(canvasElement).filter((r) => !r.textContent?.startsWith('Рука'))) {
      await expect(r).toHaveAttribute('aria-pressed', 'true');
    }
  },
};

export const PickDate: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '5 сентября' }));
    await expect(c.getByRole('button', { name: '5 сентября' })).toHaveAttribute('aria-pressed', 'true');
    const card = c.getByRole('region', { name: 'Изменение с 5 сентября' });
    await expect(within(card).getByText('5 сентября')).toBeVisible();
    await expect(within(card).queryByText('14 ноября')).toBeNull();
    const waist = within(row(canvasElement, 'Талия'));
    await expect(waist.getByText('84 см')).toBeVisible();
    await expect(waist.getByText('0 %')).toBeVisible();
  },
};

export const Month: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '14 ноября' }));
    await userEvent.click(c.getByRole('tab', { name: 'Месяц' }));
    await expect(c.getByRole('tab', { name: 'Месяц' })).toHaveAttribute('aria-selected', 'true');
    const card = c.getByRole('region', { name: 'Изменение с 17 октября' });
    const chart = within(card).getByRole('group', { name: 'Изменение показателей с 17 октября по 14 ноября' });
    await expect(within(chart).getAllByRole('button')).toHaveLength(3);
    await expect(within(chart).getByRole('button', { name: '14 ноября' })).toHaveAttribute('aria-pressed', 'true');
    // База сдвинулась на 17 октября: 82 → 80,5
    await expect(within(row(canvasElement, 'Талия')).getByText('−1,8 %')).toBeVisible();
  },
};

/** Выбранная дата сбрасывается при смене периода: без сброса в «Месяц» осталась бы 17 октября (индекс 1) */
export const PeriodResetsPoint: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const card = within(c.getByRole('region', { name: 'Изменение с 5 сентября' }));
    await userEvent.click(c.getByRole('button', { name: '5 сентября' }));
    await expect(card.getByText('5 сентября')).toBeVisible();
    await userEvent.click(c.getByRole('tab', { name: 'Месяц' }));
    const month = within(c.getByRole('region', { name: 'Изменение с 17 октября' }));
    await expect(month.getByText('14 ноября')).toBeVisible();
    await expect(c.getByRole('button', { name: '14 ноября' })).toHaveAttribute('aria-pressed', 'true');
  },
};

export const NoDataForSelection: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const l = list(canvasElement);
    await userEvent.click(l.getByRole('button', { name: 'Очистить' }));
    await userEvent.click(row(canvasElement, 'Икры'));
    await expect(row(canvasElement, 'Икры')).toHaveAttribute('aria-pressed', 'true');
    await expect(c.getByText('Нет данных за период')).toBeVisible();
    await expect(c.queryByRole('group', { name: /^Изменение показателей/ })).toBeNull();
    await expect(c.queryByText('Выберите показатели в списке')).toBeNull();
    await userEvent.click(row(canvasElement, 'Вес'));
    await expect(c.queryByText('Нет данных за период')).toBeNull();
    await expect(c.getByRole('group', { name: /^Изменение показателей/ })).toBeVisible();
  },
};

export const WithCalf: Story = {
  render: () => <Interactive entries={withCalf} onAdd={() => {}} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '5 сентября' }));
    await expect(within(row(canvasElement, 'Икры')).getAllByText('—')).toHaveLength(2);
    await userEvent.click(c.getByRole('button', { name: '14 ноября' }));
    const calf = within(row(canvasElement, 'Икры'));
    await expect(calf.getByText('35,5 см')).toBeVisible();
    await expect(calf.getByText('+1,4 %')).toBeVisible();
    await expect(canvasElement.textContent).not.toMatch(/NaN|Infinity/);
  },
};

export const Tab: Story = {
  render: () => <Interactive entries={entries} tab onAdd={() => {}} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('heading', { level: 1, name: 'Замеры' })).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Назад' })).toBeNull();
  },
};
export const Desktop: Story = {
  render: () => <Interactive entries={entries} tab onAdd={() => {}} />,
  globals: { viewport: { value: 'desktop', isRotated: false } },
};

export const TrainerReadOnly: Story = {
  render: () => <Interactive entries={entries} trainer />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Новый замер' })).toBeNull();
    await expect(within(canvasElement).queryByRole('link', { name: 'Новый замер' })).toBeNull();
    // Внутри карточки ученика своей шапки с «Назад» нет: она у AthleteHeader
    await expect(within(canvasElement).queryByRole('button', { name: 'Назад' })).toBeNull();
    await expect(within(canvasElement).getByRole('region', { name: 'Изменение с 5 сентября' })).toBeVisible();
  },
};

export const AddCallsBack: Story = {
  render: (args) => <Interactive entries={entries} onAdd={args.onAdd} />,
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Новый замер' }));
    await expect(args.onAdd).toHaveBeenCalled();
  },
};

export const Empty: Story = {
  render: () => <Interactive entries={[]} onAdd={() => {}} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Замеров пока нет')).toBeVisible();
    await expect(c.getByRole('button', { name: 'Новый замер' })).toBeVisible();
    await expect(canvasElement.textContent).not.toMatch(/NaN/);
  },
};

export const EmptyForTrainer: Story = {
  render: () => <Interactive entries={[]} trainer />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('Замеров пока нет')).toBeVisible();
    await expect(c.queryByRole('button', { name: 'Новый замер' })).toBeNull();
  },
};

export const SingleEntry: Story = {
  render: () => <Interactive entries={entries.slice(-1)} onAdd={() => {}} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const chart = c.getByRole('group', { name: /^Изменение показателей/ });
    await expect(within(chart).getAllByRole('button')).toHaveLength(1);
    await expect(within(row(canvasElement, 'Вес')).getByText('72 кг')).toBeVisible();
    for (const f of MEASUREMENT_FIELDS.filter((f) => f.kind !== 'calf')) {
      await expect(within(row(canvasElement, f.label)).getByText('0 %')).toBeVisible();
    }
    await expect(canvasElement.textContent).not.toMatch(/NaN|Infinity/);
  },
};

export const NeverFilledKind: Story = {
  render: () => <Interactive entries={entries.map((e) => ({ date: e.date, values: { weight: e.values.weight } }))} onAdd={() => {}} />,
  play: async ({ canvasElement }) => {
    await expect(within(row(canvasElement, 'Рука')).getAllByText('—')).toHaveLength(2);
    await expect(within(row(canvasElement, 'Вес')).getByText('−3 %')).toBeVisible();
    await expect(canvasElement.textContent).not.toMatch(/NaN/);
  },
};

/** Телефон Samsung A15, 384 px: колонка 352 px, как в AppShell (рамка шире на 8 px с боков: туда выступает TopBar). Строки списка не вылезают, подписи дат не накладываются */
export const PhoneA15: Story = {
  globals: { viewport: { value: 'a15', isRotated: false } },
  render: () => (
    <div data-testid="frame" style={{ margin: '0 calc(-1 * var(--spacing-xs))', padding: '0 var(--spacing-xs)' }}>
      <Interactive entries={entries} onAdd={() => {}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const frame = c.getByTestId('frame');
    const check = async () => {
      await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
      for (const b of list(canvasElement).getAllByRole('button')) await expect(b.scrollWidth).toBeLessThanOrEqual(b.clientWidth);
    };
    await check();
    const ticks = [...frame.querySelectorAll<HTMLElement>('span[style*="left"]')].filter((el) => !el.hidden);
    const rects = ticks.map((el) => el.getBoundingClientRect()).sort((a, b) => a.left - b.left);
    await expect(rects.length).toBeGreaterThan(1);
    for (let i = 1; i < rects.length; i++) await expect(rects[i].left).toBeGreaterThanOrEqual(rects[i - 1].right);
    await userEvent.click(c.getByRole('tab', { name: 'кг, см' }));
    await check();
  },
};
