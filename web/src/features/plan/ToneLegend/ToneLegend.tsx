import type { PlanTemplate } from '../../../data/types';
import { ToneDot } from '../../../ui';
import styles from './ToneLegend.module.css';

type Props = {
  templates: PlanTemplate[];
};

/** Подпись цветов календаря: метка и название типа тренировки. */
export function ToneLegend({ templates }: Props) {
  return (
    <ul className={styles.root} aria-label="Типы тренировок">
      {templates.map((t) => (
        <li key={t.id} className={styles.item}>
          <ToneDot tone={t.tone} />
          {t.title}
        </li>
      ))}
    </ul>
  );
}
