import { useState } from 'react';
import type { MeasurementEntry, MeasurementKind } from '../../../../../shared/types';
import { Button, IconButton, MeasureRow, Notice, Text, TopBar } from '../../../ui';
import { Chibi } from '../../workout/chibi/Chibi';
import { formatDateLong, formatDateWithWeekday, formatValue, lastBefore, MEASUREMENT_FIELDS, parseInput } from '../measurements';
import styles from './MeasureFormView.module.css';

type Props = {
  /** Дата замера, ISO */
  today: string;
  /** Вся история: из неё берутся прошлые значения («было …») */
  entries: MeasurementEntry[];
  saving: boolean;
  error?: string;
  onBack: () => void;
  onSave: (entry: MeasurementEntry) => void;
};

type Values = Partial<Record<MeasurementKind, string>>;

const DEFAULT_HINT = 'Утром, натощак, до тренировки. Нажмите на поле — подскажу, где мерить.';

/** Экран ввода замера: семь полей, подсказка по фокусу, пустые поля можно пропустить. */
export function MeasureFormView({ today, entries, saving, error, onBack, onSave }: Props) {
  const [values, setValues] = useState<Values>(() => {
    // Повторное открытие в тот же день: подставляем уже сохранённые значения
    const saved = entries.find((e) => e.date === today);
    const init: Values = {};
    if (saved) for (const f of MEASUREMENT_FIELDS) if (typeof saved.values[f.kind] === 'number') init[f.kind] = formatValue(saved.values[f.kind] as number);
    return init;
  });
  const [active, setActive] = useState<MeasurementKind | null>(null);

  const parsed: Partial<Record<MeasurementKind, number>> = {};
  for (const f of MEASUREMENT_FIELDS) {
    const n = parseInput(values[f.kind] ?? '');
    if (n !== null) parsed[f.kind] = n;
  }
  const filled = Object.keys(parsed).length;
  const activeField = MEASUREMENT_FIELDS.find((f) => f.kind === active);

  // Дата самого свежего прошлого замера: «Серым — прошлый замер, 31 октября»
  const previousDates = entries.filter((e) => e.date < today).map((e) => e.date);
  const previousDate = previousDates.length > 0 ? previousDates[previousDates.length - 1] : null;

  const save = () => {
    if (saving || filled === 0) return;
    onSave({ date: today, values: parsed });
  };

  return (
    <div className={styles.root}>
      <TopBar
        start={<IconButton bare icon="back" aria-label="Назад" onClick={onBack} />}
        end={<span className={styles.date}>{formatDateWithWeekday(today)}</span>}
      />
      <div className={styles.intro}>
        <div className={styles.introText}>
          <Text variant="h1" tag="h1" className={styles.title}>
            Замеры
          </Text>
          <div role="status" className={styles.hint}>
            <span className={styles.hintTitle}>{activeField ? activeField.label : 'Как мерить'}</span>
            <span className={styles.hintText}>{activeField ? activeField.hint : DEFAULT_HINT}</span>
          </div>
        </div>
        <div className={styles.chibi}>
          <Chibi pose="stand" face="happy" size={112} />
        </div>
      </div>

      <div className={styles.card}>
        {MEASUREMENT_FIELDS.map((f) => (
          <MeasureRow
            key={f.kind}
            id={f.kind}
            label={f.label}
            unit={f.unit}
            previous={lastBefore(entries, f.kind, today)}
            value={values[f.kind] ?? ''}
            active={active === f.kind}
            onChange={(raw) => setValues((v) => ({ ...v, [f.kind]: raw }))}
            onFocus={() => setActive(f.kind)}
          />
        ))}
      </div>

      <p className={styles.note}>
        {previousDate ? `Серым — прошлый замер, ${formatDateLong(previousDate)}. ` : ''}Пустые поля можно пропустить.
      </p>

      {error && (
        <Notice tone="error" className={styles.error}>
          {error}
        </Notice>
      )}

      <div className={styles.spacer} />

      <Button icon="check" fullWidth loading={saving} disabled={filled === 0} onClick={save}>
        {filled > 0 ? `Сохранить · ${filled} из ${MEASUREMENT_FIELDS.length}` : 'Сохранить'}
      </Button>
    </div>
  );
}
