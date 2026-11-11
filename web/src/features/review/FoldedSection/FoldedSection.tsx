import { type ReactNode, useState } from 'react';
import type { ReviewSection } from '../../../../../shared/types';
import { sectionOpenByDefault, sectionSummary } from '../sections';
import styles from './FoldedSection.module.css';

/** Свёрнутый блок тренировки (разминка, заминка); открыт сразу, если в нём есть комментарии или новое */
export function FoldedSection({ section, children }: { section: ReviewSection; children: ReactNode }) {
  // Начальное состояние читаем один раз: удаление последнего комментария не должно сворачивать блок под рукой
  const [open, setOpen] = useState(() => sectionOpenByDefault(section));
  return (
    <details className={styles.fold} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={styles.summary}>{sectionSummary(section)}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
