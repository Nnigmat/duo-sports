import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import styles from './SetChip.module.css';

type Props = {
  /** Номер подхода в упражнении */
  n: number;
  /** «90 кг × 5» */
  label: string;
  completed: boolean;
  hasVideo?: boolean;
  className?: string;
};

/** Чип подхода. Видео: рамка primary и значок; не выполнен: пунктир, зачёркивания нет, плюс подпись для скринридера. */
export function SetChip({ n, label, completed, hasVideo = false, className }: Props) {
  return (
    <span className={cx(styles.chip, hasVideo && styles.video, !completed && styles.skipped, className)}>
      <span className={styles.n}>{n}.</span>
      <span>{label}</span>
      {hasVideo && <Icon name="video" size={20} className={styles.icon} />}
      {hasVideo && <span className={styles.sr}>, есть видео</span>}
      {!completed && <span className={styles.sr}>, не выполнен</span>}
    </span>
  );
}
