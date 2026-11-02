import { Badge } from '../../../ui';
import type { FieldRow } from '../format';
import styles from './FieldTable.module.css';

type Props = {
  rows: FieldRow[];
  /** Название таблицы для скринридера */
  caption: string;
  /** Заголовок второго столбца: «Значение» или «Пример» */
  valueHeader?: string;
};

/** Таблица полей: имя с пометкой «обязательно», значение, описание. */
export function FieldTable({ rows, caption, valueHeader = 'Пример' }: Props) {
  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={caption}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Поле</th>
            <th scope="col">{valueHeader}</th>
            <th scope="col">Описание</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field}>
              <th scope="row" className={styles.field}>
                <code>{r.field}</code>
                {r.flag?.kind === 'required' && <Badge tone="primary">обязательно</Badge>}
                {r.flag?.kind === 'recommended' && <Badge tone="neutral">{r.flag.label ?? 'рекомендуется'}</Badge>}
              </th>
              <td>
                <code>{r.value}</code>
              </td>
              <td>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
