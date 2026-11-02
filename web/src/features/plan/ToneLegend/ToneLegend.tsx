import type { PlanTemplate } from '../../../data/types';
import { ToneDot } from '../../../ui';
import styles from './ToneLegend.module.css';

type Props = {
  templates: PlanTemplate[];
  /** Сколько названий показываем; остальные — «и ещё N» */
  max?: number;
};

/** Подпись цветов календаря: метка и название типа тренировки. */
export function ToneLegend({ templates, max = 6 }: Props) {
  const shown = templates.slice(0, max);
  const rest = templates.length - shown.length;
  return (
    <ul className={styles.root} aria-label="Типы тренировок">
      {shown.map((t) => (
        <li key={t.id} className={styles.item}>
          <ToneDot tone={t.tone} />
          {t.title}
        </li>
      ))}
      {rest > 0 && <li className={styles.item}>и ещё {rest}</li>}
    </ul>
  );
}
