import { cx } from '../cx';
import { roman } from '../labels';
import styles from './TierSteps.module.css';

export type TierStep = {
  /** Условие уровня: «4 недели» */
  label: string;
  state: 'done' | 'next' | 'future';
};

type Props = {
  steps: TierStep[];
  className?: string;
};

const STATE_WORD = { done: 'получен', next: 'следующий', future: 'впереди' } as const;

/** Чипы уровней I, II, III. Состояние — галочка и слово для скринридера, не только цвет. */
export function TierSteps({ steps, className }: Props) {
  return (
    <ol className={cx(styles.list, className)}>
      {steps.map((s, i) => (
        <li key={i} className={cx(styles.chip, styles[s.state])}>
          {s.state === 'done' && <span aria-hidden="true">✓ </span>}
          <span aria-hidden="true">{roman((i + 1) as 1 | 2 | 3)}</span>
          <span className={styles.label}>{` ${s.label}`}</span>
          <span className={styles.hidden}>{`, уровень ${roman((i + 1) as 1 | 2 | 3)} ${STATE_WORD[s.state]}`}</span>
        </li>
      ))}
    </ol>
  );
}
