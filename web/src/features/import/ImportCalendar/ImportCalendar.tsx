import { Icon, Text } from '../../../ui';
import { WEEKDAY_HEADERS, addDays, parseIso } from '../../plan/plan';
import { dayLabel, type CellKind, type DayCell } from '../importPlan';
import styles from './ImportCalendar.module.css';

type Props = {
  title: string;
  note: string;
  /** Недели сверху вниз; первый день каждой — понедельник */
  weeks: DayCell[][];
};

const LEGEND: Array<{ kind: CellKind; label: string }> = [
  { kind: 'import', label: 'Из файла' },
  { kind: 'mine', label: 'Уже в плане' },
  { kind: 'conflict', label: 'Конфликт' },
  { kind: 'skipped', label: 'Пропущена' },
];

const KIND_WORD: Record<CellKind, string> = { empty: '', mine: 'уже в плане', import: 'из файла', conflict: 'конфликт', skipped: 'пропущена' };

/** Календарь импорта: недели строками. Тип дня — рамка и подпись, не только цвет. */
export function ImportCalendar({ title, note, weeks }: Props) {
  return (
    <section className={styles.root} aria-labelledby="import-cal-title">
      <div className={styles.head}>
        <Text variant="h3" tag="h2" id="import-cal-title">
          {title}
        </Text>
        <Text variant="body-sm" color="slate">
          {note}
        </Text>
        <ul className={styles.legend} aria-label="Обозначения">
          {LEGEND.map((l) => (
            <li key={l.kind} className={styles.legendItem}>
              <span className={styles.swatch} data-kind={l.kind} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.scroll} tabIndex={0} role="region" aria-label="Календарь импорта по неделям">
        <table className={styles.table}>
          <thead>
            <tr>
              <td />
              {WEEKDAY_HEADERS.map((d) => (
                <th key={d} scope="col" className={styles.dow}>
                  {d[0]!.toUpperCase() + d.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((row, i) => (
              <tr key={row[0]!.date}>
                <th scope="row" className={styles.week}>
                  <span>Нед {i + 1}</span>
                  <span className={styles.range}>
                    {parseIso(row[0]!.date).getDate()}–{dayLabel(addDays(row[0]!.date, 6))}
                  </span>
                </th>
                {row.map((c) => (
                  <td key={c.date} className={styles.cell} data-kind={c.kind}>
                    <span className={styles.date}>
                      {parseIso(c.date).getDate()}
                      {c.kind === 'conflict' && <Icon name="warning" size={20} className={styles.warn} />}
                    </span>
                    {c.kind !== 'empty' && <span className={styles.sr}>{KIND_WORD[c.kind]}: </span>}
                    {c.strike && <s className={styles.strike}>{c.strike}</s>}
                    {c.title && <span className={styles.title}>{c.title}</span>}
                    {c.second && <span className={styles.title}>{c.second}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
