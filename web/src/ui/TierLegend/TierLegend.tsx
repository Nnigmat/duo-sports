import { cx } from '../cx';
import type { Tier } from '../labels';
import { TierMark } from '../TierMark/TierMark';
import styles from './TierLegend.module.css';

const ITEMS: Array<{ tier: Tier; name: string; level: string }> = [
  { tier: 0, name: 'Нет', level: 'отсутствует' },
  { tier: 1, name: 'Бронза', level: 'начальный' },
  { tier: 2, name: 'Серебро', level: 'средний' },
  { tier: 3, name: 'Золото', level: 'полный' },
];

type Props = {
  /** Заголовок над списком: «Уровни достижений» */
  title?: string;
  className?: string;
};

/** Легенда уровней: форма, название металла и степень. */
export function TierLegend({ title, className }: Props) {
  return (
    <div className={cx(styles.root, className)}>
      {title && <span className={styles.title}>{title}</span>}
      <ul className={styles.list}>
        {ITEMS.map((i) => (
          <li key={i.tier} className={styles.item}>
            <TierMark tier={i.tier} size={24} stroke={4} />
            <span>
              <span className={styles.name}>{i.name}</span> · {i.level}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
