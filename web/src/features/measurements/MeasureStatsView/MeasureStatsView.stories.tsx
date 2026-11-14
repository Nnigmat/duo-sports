import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { MeasurementEntry, MeasurementKind } from '../../../../../shared/types';
import { measurementsFixture } from '../../../data/fixtures';
import { ARTIFACT } from '../../../ui/storyKit';
import type { Period } from '../measurements';
import { MeasureStatsView } from './MeasureStatsView';

type Init = { kind?: MeasurementKind; period?: Period; point?: number | null };

function Interactive(props: { entries: MeasurementEntry[]; init?: Init; trainer?: boolean; onAdd?: () => void }) {
  const [kind, setKind] = useState<MeasurementKind>(props.init?.kind ?? 'weight');
  const [period, setPeriod] = useState<Period>(props.init?.period ?? 'all');
  const [point, setPoint] = useState<number | null>(props.init?.point ?? null);
  return (
    <MeasureStatsView
      today="2026-11-14"
      entries={props.entries}
      kind={kind}
      period={period}
      point={point}
      onKind={(k) => {
        setKind(k);
        setPoint(null);
      }}
      onPeriod={(p) => {
        setPeriod(p);
        setPoint(null);
      }}
      onPoint={setPoint}
      onBack={props.trainer ? undefined : () => {}}
      onAdd={props.trainer ? undefined : props.onAdd}
    />
  );
}

const entries = measurementsFixture.entries;

const meta = {
  title: 'Features/Measurements/MeasureStatsView',
  component: MeasureStatsView,
  args: {
    today: '2026-11-14',
    entries,
    kind: 'weight',
    period: 'all',
    point: null,
    onKind: fn(),
    onPeriod: fn(),
    onPoint: fn(),
    onBack: fn(),
    onAdd: fn(),
  },
  render: () => <Interactive entries={entries} onAdd={() => {}} />,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: `Экран «Прогресс по замерам». Артборд «07 · Статистика замеров». ${ARTIFACT}` } },
  },
} satisfies Meta<typeof MeasureStatsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const card = c.getByRole('region', { name: 'Вес' });
    await expect(within(card).getByText('72')).toBeVisible();
    await expect(within(card).getByText('Последний замер · 14 ноября')).toBeVisible();
    await expect(within(card).getByText('−2,2 кг')).toBeVisible();
    await expect(within(card).getByText('с 5 сентября')).toBeVisible();

    await userEvent.click(c.getByRole('button', { name: '5 сентября: 74,2 кг' }));
    await expect(within(card).getByText('74,2')).toBeVisible();
    await expect(within(card).getByText('5 сентября')).toBeVisible();
    await expect(within(card).queryByText(/Последний/)).toBeNull();
  },
};

export const SwitchesMetric: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const row = c.getByRole('button', { name: /^Талия/ });
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(row);
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    const card = c.getByRole('region', { name: 'Талия' });
    await expect(within(card).getByText('80,5')).toBeVisible();
    await expect(within(card).getByText('−3,5 см')).toBeVisible();
  },
};

export const Month: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('tab', { name: 'Месяц' }));
    await expect(c.getByRole('tab', { name: 'Месяц' })).toHaveAttribute('aria-selected', 'true');
    const card = c.getByRole('region', { name: 'Вес' });
    await expect(within(card).getAllByRole('button')).toHaveLength(3);
    await expect(within(card).getByText('−0,9 кг')).toBeVisible();
    await expect(within(card).getByText('с 17 октября')).toBeVisible();
  },
};

export const WaistSelected: Story = {
  render: () => <Interactive entries={entries} init={{ kind: 'waist', point: 2 }} onAdd={() => {}} />,
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByRole('region', { name: 'Талия' });
    await expect(within(card).getByText('82,5')).toBeVisible();
    await expect(within(card).getByText('3 октября')).toBeVisible();
  },
};

export const TrainerReadOnly: Story = {
  render: () => <Interactive entries={entries} trainer />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Новый замер' })).toBeNull();
    await expect(within(canvasElement).queryByRole('link', { name: 'Новый замер' })).toBeNull();
    // Внутри карточки ученика своей шапки с «Назад» нет: она у AthleteHeader
    await expect(within(canvasElement).queryByRole('button', { name: 'Назад' })).toBeNull();
    await expect(within(canvasElement).getByRole('region', { name: 'Вес' })).toBeVisible();
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
    const card = within(canvasElement).getByRole('region', { name: 'Вес' });
    await expect(within(card).getByText('72')).toBeVisible();
    await expect(within(card).getAllByRole('button')).toHaveLength(1);
    await expect(within(card).getByText('0 кг')).toBeVisible();
    await expect(canvasElement.textContent).not.toMatch(/NaN|Infinity/);
  },
};

export const NeverFilledKind: Story = {
  render: () => (
    <Interactive
      entries={entries.map((e) => ({ date: e.date, values: { weight: e.values.weight } }))}
      init={{ kind: 'arm' }}
      onAdd={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const card = c.getByRole('region', { name: 'Рука' });
    await expect(within(card).getByText('Нет данных')).toBeVisible();
    await expect(within(card).getByText('—')).toBeVisible();
    await expect(within(c.getByRole('button', { name: /^Рука/ })).getByText('—')).toBeVisible();
    await expect(canvasElement.textContent).not.toMatch(/NaN/);
  },
};
