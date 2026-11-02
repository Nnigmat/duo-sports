import { Icon } from '../../../ui';
import { IMPORT_STEPS } from '../import';
import styles from './ImportSteps.module.css';

type Props = {
  /** Номер текущего шага с 1 */
  current: 1 | 2 | 3 | 4;
};

/** Четыре шага импорта; пройденные отмечены галочкой, текущий — aria-current="step". */
export function ImportSteps({ current }: Props) {
  return (
    <ol className={styles.root} aria-label="Шаги импорта">
      {IMPORT_STEPS.map((title, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'next';
        return (
          <li key={title} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={styles.mark} aria-hidden="true">
              {state === 'done' ? <Icon name="check" size={20} /> : n}
            </span>
            {title}
            {state === 'done' && <span className={styles.sr}>, пройден</span>}
          </li>
        );
      })}
    </ol>
  );
}
