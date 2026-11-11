import type { ReactNode } from 'react';
import type { ReviewSection } from '../../../../../shared/types';
import { sectionOpenByDefault, sectionSummary } from '../sections';
import styles from './FoldedSection.module.css';

/** Свёрнутый блок тренировки (разминка, заминка); открыт сразу, если в нём есть комментарии или новое */
export function FoldedSection({ section, children }: { section: ReviewSection; children: ReactNode }) {
  return (
    <details className={styles.fold} open={sectionOpenByDefault(section) || undefined}>
      <summary className={styles.summary}>{sectionSummary(section)}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
