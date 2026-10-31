import type { PlanTemplate } from '../../../data/types';
import { Text, ToneDot } from '../../../ui';
import styles from './QuickAdd.module.css';

type Props = {
  templates: PlanTemplate[];
  onAdd: (templateId: string) => void;
};

/** Готовые тренировки для пустого дня: одно нажатие — и тренировка стоит в плане. */
export function QuickAdd({ templates, onAdd }: Props) {
  return (
    <div className={styles.root}>
      <Text variant="caption" color="steel" tag="p">
        Или добавь готовую:
      </Text>
      <ul className={styles.list}>
        {templates.map((t) => (
          <li key={t.id}>
            <button type="button" className={styles.row} onClick={() => onAdd(t.id)}>
              <ToneDot tone={t.tone} />
              <span className={styles.title}>{t.title}</span>
              <span className={styles.dur}>≈ {t.minutes} мин</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
