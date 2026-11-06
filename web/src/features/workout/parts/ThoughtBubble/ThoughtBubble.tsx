import type { Pose } from '../../../../../../shared/types';
import { cx } from '../../../../ui/cx';
import { Chibi } from '../../chibi/Chibi';
import styles from './ThoughtBubble.module.css';

type Props = {
  /** Поза следующего упражнения */
  pose: Pose;
  className?: string;
};

/** Облачко-мысль над чибиком на отдыхе: в нём мини-чибик в позе следующего упражнения. Декор: подпись уже в тексте экрана. */
export function ThoughtBubble({ pose, className }: Props) {
  return (
    <div className={cx(styles.root, className)} data-pose={pose} aria-hidden="true">
      <svg width="128" height="104" viewBox="0 0 128 104" aria-hidden="true" className={styles.cloud}>
        {/* Сначала обводка всех кругов, потом заливка: швов между кругами нет */}
        <g className={styles.outline}>
          <circle cx="34" cy="56" r="26" />
          <circle cx="62" cy="36" r="30" />
          <circle cx="94" cy="44" r="26" />
          <circle cx="100" cy="70" r="22" />
          <circle cx="66" cy="74" r="26" />
          <circle cx="34" cy="78" r="18" />
        </g>
        <g className={styles.fill}>
          <circle cx="34" cy="56" r="26" />
          <circle cx="62" cy="36" r="30" />
          <circle cx="94" cy="44" r="26" />
          <circle cx="100" cy="70" r="22" />
          <circle cx="66" cy="74" r="26" />
          <circle cx="34" cy="78" r="18" />
        </g>
        <circle cx="10" cy="110" r="7" className={styles.dot} />
        <circle cx="0" cy="126" r="4.5" className={styles.dot} />
      </svg>
      <Chibi pose={pose} size={88} className={styles.pose} />
    </div>
  );
}
