import { cx } from '../../../../ui/cx';
import { Text } from '../../../../ui/Text/Text';
import styles from './SpeechBubble.module.css';

type Props = {
  /** Надстрочник: «Подход 1 из 9» */
  eyebrow: string;
  /** Одна строка данных: «Обратные отжимания · 18–20 повт» */
  line: string;
  className?: string;
};

/** Облачко чибика с хвостиком вниз. */
export function SpeechBubble({ eyebrow, line, className }: Props) {
  return (
    <div className={cx(styles.root, className)}>
      <Text variant="eyebrow">{eyebrow}</Text>
      <Text variant="h5" tag="p" className={styles.line}>
        {line}
      </Text>
      <span className={styles.tail} aria-hidden="true" />
    </div>
  );
}
