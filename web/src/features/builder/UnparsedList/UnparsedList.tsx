import { Text } from '../../../ui';
import type { Unparsed } from '../repair';
import styles from './UnparsedList.module.css';

type Props = {
  items: Unparsed[];
};

/** «Не разобрал»: что из ответа агента убрано при ремонте и почему. Только читается, сохранить не мешает. */
export function UnparsedList({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <section className={styles.root} aria-labelledby="unparsed-title">
      <Text variant="eyebrow" tag="h2" id="unparsed-title">
        Не разобрал
      </Text>
      <ul className={styles.list}>
        {items.map((u) => (
          <li key={`${u.what}|${u.message}`} className={styles.item}>
            <Text variant="body-sm" className={styles.what}>
              {u.what}
            </Text>
            <Text variant="caption">{u.message}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}
