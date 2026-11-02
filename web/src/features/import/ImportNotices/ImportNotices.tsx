import { Icon, Text } from '../../../ui';
import type { Notice } from '../done';
import styles from './ImportNotices.module.css';

type Props = { notices: Notice[] };

/** «Обратите внимание»: что импорт сделал не так, как можно ждать. Без замечаний блока нет. */
export function ImportNotices({ notices }: Props) {
  if (notices.length === 0) return null;
  return (
    <section className={styles.root} aria-labelledby="notices-title">
      <Text variant="h3" tag="h2" id="notices-title">
        Обратите внимание
      </Text>
      <ul className={styles.list}>
        {notices.map((n) => (
          <li key={n.title} className={styles.item}>
            <Icon name="info" size={20} className={styles.icon} />
            <div className={styles.texts}>
              <span className={styles.title}>{n.title}</span>
              <span className={styles.text}>{n.text}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
