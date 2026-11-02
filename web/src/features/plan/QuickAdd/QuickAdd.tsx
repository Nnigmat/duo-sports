import { useState } from 'react';
import type { PlanTemplate } from '../../../data/types';
import { Button, Text, ToneDot } from '../../../ui';
import styles from './QuickAdd.module.css';

type Props = {
  templates: PlanTemplate[];
  onAdd: (templateId: string) => void;
  /** Сколько готовых тренировок видно, пока список не раскрыт */
  limit?: number;
};

/** Готовые тренировки для пустого дня: одно нажатие — и тренировка стоит в плане. */
export function QuickAdd({ templates, onAdd, limit = 6 }: Props) {
  const [all, setAll] = useState(false);
  const shown = all ? templates : templates.slice(0, limit);
  if (templates.length === 0) return null;
  return (
    <div className={styles.root}>
      <Text variant="caption" color="steel" tag="p">
        Или добавь готовую:
      </Text>
      <ul className={styles.list}>
        {shown.map((t) => (
          <li key={t.id}>
            <button type="button" className={styles.row} onClick={() => onAdd(t.id)}>
              <ToneDot tone={t.tone} />
              <span className={styles.title}>{t.title}</span>
              <span className={styles.dur}>≈ {t.minutes} мин</span>
            </button>
          </li>
        ))}
      </ul>
      {templates.length > limit && (
        <Button variant="ghost" compact aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Свернуть' : `Показать все ${templates.length}`}
        </Button>
      )}
    </div>
  );
}
