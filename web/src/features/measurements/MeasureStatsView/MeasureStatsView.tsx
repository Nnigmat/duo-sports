import { type ReactNode, useId } from 'react';
import { MEASUREMENT_KINDS } from '../../../../../shared/measurements';
import type { MeasurementEntry, MeasurementKind } from '../../../../../shared/types';
import { Button, EmptyState, Icon, IconButton, MultiLineChart, SegmentedControl, Text, TopBar } from '../../../ui';
import { cx } from '../../../ui/cx';
import {
  type ChangeMode,
  changeSeries,
  entriesInPeriod,
  formatChange,
  formatDateLong,
  formatDateShort,
  formatDelta,
  formatValue,
  MEASUREMENT_FIELDS,
  type Period,
} from '../measurements';
import styles from './MeasureStatsView.module.css';

type Props = {
  today: string;
  entries: MeasurementEntry[];
  /** Показатели, чьи линии видны на графике, в порядке MEASUREMENT_FIELDS */
  visible: MeasurementKind[];
  period: Period;
  mode: ChangeMode;
  /** Индекс выбранного замера в периоде; null — последний */
  point: number | null;
  onVisible: (kinds: MeasurementKind[]) => void;
  onPeriod: (period: Period) => void;
  onMode: (mode: ChangeMode) => void;
  onPoint: (index: number) => void;
  /** Стрелка «назад» в шапке; без неё и без titled шапки нет: экран встроен в карточку ученика у тренера */
  onBack?: () => void;
  /** Заголовок страницы без стрелки: экран открыт как вкладка */
  titled?: boolean;
  /** Только у ученика: у тренера экран только для чтения */
  onAdd?: () => void;
};

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
];

const MODES: Array<{ value: ChangeMode; label: string }> = [
  { value: 'percent', label: '%' },
  { value: 'units', label: 'кг, см' },
];

/** Экран «Прогресс по замерам»: период, общий график изменений и список всех восьми показателей. */
function Shell({ onBack, titled, children }: { onBack?: () => void; titled?: boolean; children: ReactNode }) {
  if (!onBack && !titled) return <div className={styles.embedded}>{children}</div>;
  return (
    <div className={styles.root}>
      {onBack && <TopBar start={<IconButton bare icon="back" aria-label="Назад" onClick={onBack} />} />}
      <Text variant="h1" tag="h1" className={styles.title}>
        {titled ? 'Замеры' : 'Прогресс'}
      </Text>
      {children}
    </div>
  );
}

export function MeasureStatsView({
  today,
  entries,
  visible,
  period,
  mode,
  point,
  onVisible,
  onPeriod,
  onMode,
  onPoint,
  onBack,
  onAdd,
  titled,
}: Props) {
  const headId = useId();
  const addButton = onAdd && (
    <Button icon="plus" fullWidth onClick={onAdd}>
      Новый замер
    </Button>
  );

  if (entries.length === 0) {
    return (
      <Shell onBack={onBack} titled={titled}>
        <EmptyState title="Замеров пока нет" description={onAdd ? 'Запишите вес и обхваты, чтобы видеть изменения.' : undefined} />
        <div className={styles.spacer} />
        {addButton}
      </Shell>
    );
  }

  const shown = entriesInPeriod(entries, period, today);
  const n = shown.length;
  const sel = point === null ? n - 1 : Math.min(Math.max(point, 0), n - 1);
  const first = shown[0];
  const last = shown[n - 1];
  const picked = shown[sel];
  const changes = new Map(MEASUREMENT_FIELDS.map((f) => [f.kind, changeSeries(shown, f.kind, mode)]));
  const lines = MEASUREMENT_FIELDS.filter((f) => visible.includes(f.kind)).map((f) => ({
    id: f.kind,
    values: changes.get(f.kind) ?? [],
    color: f.color,
    emphasis: f.kind === 'weight',
  }));
  const hasData = lines.some((l) => l.values.some((v) => v !== null));
  const chartLabel =
    n > 1
      ? `Изменение показателей с ${formatDateLong(first.date)} по ${formatDateLong(last.date)}`
      : `Изменение показателей на ${formatDateLong(last.date)}`;
  // На оси в режиме «кг, см» кг и см вместе, поэтому без единицы
  const formatTick = mode === 'percent' ? (v: number) => formatChange(v, 'percent', 'см') : formatDelta;

  const toggle = (kind: MeasurementKind) =>
    onVisible(
      visible.includes(kind)
        ? visible.filter((k) => k !== kind)
        : MEASUREMENT_KINDS.filter((k) => k === kind || visible.includes(k)),
    );

  return (
    <Shell onBack={onBack} titled={titled}>
      <SegmentedControl label="Период" options={PERIODS} value={period} onChange={onPeriod} className={styles.period} />

      <div className={styles.body}>
        <section className={styles.card} aria-labelledby={headId}>
          <div className={styles.head}>
            <div className={styles.headMain}>
              <span id={headId} className={styles.eyebrow}>
                {`Изменение с ${formatDateLong(first.date)}`}
              </span>
              <span aria-live="polite" className={styles.date}>
                {formatDateLong(picked.date)}
              </span>
            </div>
            <SegmentedControl label="Единицы" options={MODES} value={mode} onChange={onMode} className={styles.mode} />
          </div>

          {lines.length > 0 && hasData ? (
            <MultiLineChart
              dates={shown.map((e) => ({ shortLabel: formatDateShort(e.date), ariaLabel: formatDateLong(e.date) }))}
              lines={lines}
              selected={sel}
              onSelect={onPoint}
              label={chartLabel}
              minSpan={2}
              formatTick={formatTick}
            />
          ) : (
            <p className={styles.noData}>{lines.length === 0 ? 'Выберите показатели в списке' : 'Нет данных за период'}</p>
          )}
        </section>

        <div role="group" aria-label="Показатели" className={styles.list}>
          <div className={styles.listHead}>
            <span className={styles.count}>{`Показатели · ${visible.length} из ${MEASUREMENT_FIELDS.length}`}</span>
            <button
              type="button"
              className={styles.textButton}
              disabled={visible.length === MEASUREMENT_FIELDS.length}
              onClick={() => onVisible([...MEASUREMENT_KINDS])}
            >
              Все
            </button>
            <button type="button" className={styles.textButton} disabled={visible.length === 0} onClick={() => onVisible([])}>
              Очистить
            </button>
          </div>
          {MEASUREMENT_FIELDS.map((f) => {
            const on = visible.includes(f.kind);
            const value = picked.values[f.kind];
            const change = changes.get(f.kind)?.[sel] ?? null;
            return (
              <button
                key={f.kind}
                type="button"
                aria-pressed={on}
                className={cx(styles.row, !on && styles.rowOff)}
                onClick={() => toggle(f.kind)}
              >
                <span className={cx(styles.check, on && styles.checkOn)} aria-hidden="true">
                  {on && <Icon name="check" size={20} />}
                </span>
                <span
                  className={cx(styles.swatch, f.kind === 'weight' && styles.swatchBold)}
                  style={{ borderColor: f.color }}
                  aria-hidden="true"
                />
                <span className={styles.rowLabel}>{f.label}</span>
                <span className={styles.rowValue}>{typeof value === 'number' ? `${formatValue(value)} ${f.unit}` : '—'}</span>
                <span className={styles.rowChange}>{change === null ? '—' : formatChange(change, mode, f.unit)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.spacer} />
      <div className={styles.add}>{addButton}</div>
    </Shell>
  );
}
