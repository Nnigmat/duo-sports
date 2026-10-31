import { cx } from '../cx';
import styles from './BarChart.module.css';

type Props = {
  /** Значения по порядку, от старых к новым; высота считается от максимума */
  values: number[];
  /** Описание для скринридера: «Рабочий вес за 8 тренировок: от 40 до 60 кг» */
  label: string;
  /** Подписи под левым и правым краем */
  firstLabel?: string;
  lastLabel?: string;
  className?: string;
};

/** Столбики динамики. Последний выделен; смысл дублирует подпись и aria-label. */
export function BarChart({ values, label, firstLabel, lastLabel, className }: Props) {
  const max = Math.max(...values, 1);
  return (
    <div className={cx(styles.root, className)}>
      <div role="img" aria-label={label} className={styles.bars}>
        {values.map((v, i) => (
          <span
            key={i}
            className={cx(styles.bar, i === values.length - 1 && styles.last)}
            style={{ height: `${Math.max(6, Math.round((v / max) * 100))}%` }}
          />
        ))}
      </div>
      {(firstLabel || lastLabel) && (
        <div className={styles.axis} aria-hidden="true">
          <span>{firstLabel}</span>
          <span>{lastLabel}</span>
        </div>
      )}
    </div>
  );
}
