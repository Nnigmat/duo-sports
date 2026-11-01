import { strengthLabels, type Strength } from '../auth';
import styles from './PasswordStrength.module.css';

type Props = {
  strength: Strength;
  /** id для aria-describedby у поля пароля */
  id?: string;
};

/** Четыре сегмента и подпись «Надёжность: слабый»; уровень всегда назван словом, не только цветом. */
export function PasswordStrength({ strength, id }: Props) {
  if (strength === 0) return null;
  return (
    <div id={id} className={styles.root}>
      <div className={styles.bar} aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={styles.seg} data-on={i <= strength || undefined} data-level={strength} />
        ))}
      </div>
      <span className={styles.label}>
        Надёжность: <b>{strengthLabels[strength]}</b>
      </span>
    </div>
  );
}
