import type { ReviewSet } from '../../../../../shared/types';
import { FACT_MARK } from '../facts';
import styles from './SetFacts.module.css';

/** Факт подходов против плана: «2. 85 кг × 6 план 80 кг × 5 Больше». Подходов с фактом нет — ничего не рисует. */
export function SetFacts({ sets }: { sets: ReviewSet[] }) {
  const withFact = sets.filter((s) => s.actualLabel);
  if (withFact.length === 0) return null;
  return (
    <ul className={styles.facts} aria-label="Факт и план">
      {withFact.map((s) => (
        <li key={s.n} className={styles.fact}>
          <span className={styles.factN}>{s.n}.</span>
          <span className={styles.factValue}>{s.actualLabel}</span>
          <span className={styles.factPlan}>план {s.label}</span>
          {s.factMark && (
            <span className={styles.factMark} data-mark={FACT_MARK[s.factMark].state}>
              {FACT_MARK[s.factMark].text}
            </span>
          )}
          {s.extraWeight && <span className={styles.factExtra}>Был доп. вес</span>}
        </li>
      ))}
    </ul>
  );
}
