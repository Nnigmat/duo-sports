import type { ReactNode } from 'react';
import type { MeasurementEntry, MeasurementKind } from '../../../../../shared/types';
import { Button, DeltaBadge, EmptyState, IconButton, LineChart, SegmentedControl, Text, TopBar } from '../../../ui';
import { cx } from '../../../ui/cx';
import {
  formatDateLong,
  formatDateShort,
  formatDelta,
  formatValue,
  MEASUREMENT_FIELDS,
  type Period,
  seriesOf,
  sliceByPeriod,
} from '../measurements';
import styles from './MeasureStatsView.module.css';

type Props = {
  today: string;
  entries: MeasurementEntry[];
  kind: MeasurementKind;
  period: Period;
  /** Индекс выбранной точки в показанной серии; null — последняя */
  point: number | null;
  onKind: (kind: MeasurementKind) => void;
  onPeriod: (period: Period) => void;
  onPoint: (index: number) => void;
  /** Без onBack своей шапки нет: экран встроен в карточку ученика у тренера */
  onBack?: () => void;
  /** Только у ученика: у тренера экран только для чтения */
  onAdd?: () => void;
};

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
];

/** Экран «Прогресс по замерам»: период, график выбранного показателя и список всех семи. */
function Shell({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  if (!onBack) return <div className={styles.embedded}>{children}</div>;
  return (
    <div className={styles.root}>
      <TopBar start={<IconButton bare icon="back" aria-label="Назад" onClick={onBack} />} />
      <Text variant="h1" tag="h1" className={styles.title}>
        Прогресс
      </Text>
      {children}
    </div>
  );
}

export function MeasureStatsView({ today, entries, kind, period, point, onKind, onPeriod, onPoint, onBack, onAdd }: Props) {
  const addButton = onAdd && (
    <Button icon="plus" fullWidth onClick={onAdd}>
      Новый замер
    </Button>
  );

  if (entries.length === 0) {
    return (
      <Shell onBack={onBack}>
        <EmptyState title="Замеров пока нет" description={onAdd ? 'Запишите вес и обхваты, чтобы видеть изменения.' : undefined} />
        <div className={styles.spacer} />
        {addButton}
      </Shell>
    );
  }

  const field = MEASUREMENT_FIELDS.find((f) => f.kind === kind) ?? MEASUREMENT_FIELDS[0];
  const series = sliceByPeriod(seriesOf(entries, field.kind), period, today);
  const n = series.length;
  const sel = point === null || point >= n ? n - 1 : point;
  const shown = n > 0 ? series[sel] : null;
  const first = series[0];
  const last = series[n - 1];

  const chartLabel =
    n === 0
      ? `${field.label}: нет данных`
      : n === 1
        ? `${field.label}, один замер ${formatDateLong(last.date)}: ${formatValue(last.value)} ${field.unit}`
        : `${field.label} с ${formatDateLong(first.date)} по ${formatDateLong(last.date)}: от ${formatValue(first.value)} до ${formatValue(last.value)} ${field.unit}`;

  return (
    <Shell onBack={onBack}>
      <SegmentedControl label="Период" options={PERIODS} value={period} onChange={onPeriod} className={styles.period} />

      <section className={styles.card} aria-labelledby="measure-metric">
        <div className={styles.head}>
          <div className={styles.headMain}>
            <span id="measure-metric" className={styles.eyebrow}>
              {field.label}
            </span>
            <div aria-live="polite" className={styles.live}>
              <div className={styles.valueLine}>
                <span className={styles.value}>{shown ? formatValue(shown.value) : '—'}</span>
                {shown && <span className={styles.unit}>{field.unit}</span>}
              </div>
              {shown && (
                <span className={styles.date}>
                  {sel === n - 1 ? `Последний замер · ${formatDateLong(shown.date)}` : formatDateLong(shown.date)}
                </span>
              )}
            </div>
          </div>
          {shown && (
            <div className={styles.delta}>
              <DeltaBadge value={last.value - first.value} unit={field.unit} />
              <span className={styles.date}>{n > 1 ? `с ${formatDateLong(first.date)}` : 'первый замер'}</span>
            </div>
          )}
        </div>

        {shown ? (
          <LineChart
            points={series.map((p) => ({
              shortLabel: formatDateShort(p.date),
              ariaLabel: `${formatDateLong(p.date)}: ${formatValue(p.value)} ${field.unit}`,
              value: p.value,
            }))}
            selected={sel}
            onSelect={onPoint}
            label={chartLabel}
          />
        ) : (
          <p className={styles.noData}>Нет данных</p>
        )}
      </section>

      <div className={styles.list}>
        {MEASUREMENT_FIELDS.map((f) => {
          const s = sliceByPeriod(seriesOf(entries, f.kind), period, today);
          const on = f.kind === kind;
          const hasData = s.length > 0;
          const rowFirst = s[0];
          const rowLast = s[s.length - 1];
          return (
            <button
              key={f.kind}
              type="button"
              aria-pressed={on}
              className={cx(styles.row, on && styles.rowOn)}
              onClick={() => onKind(f.kind)}
            >
              <span className={styles.rowLabel}>{f.label}</span>
              <span className={styles.rowValue}>{hasData ? `${formatValue(rowLast.value)} ${f.unit}` : '—'}</span>
              <span className={styles.rowChange}>
                {hasData && formatDelta(rowLast.value - rowFirst.value)}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.spacer} />
      {addButton}
    </Shell>
  );
}
