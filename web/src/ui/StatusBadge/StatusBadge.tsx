import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import styles from './StatusBadge.module.css';

export type Status = 'review' | 'new' | 'reviewed' | 'today' | 'planned' | 'moved';

const LABELS: Record<Status, string> = {
  review: 'Ждёт разбора',
  new: 'Новое',
  reviewed: 'Разобрано',
  today: 'Сегодня',
  planned: 'Запланирована',
  moved: 'Перенесена',
};

type Props = { status: Status; className?: string };

/** Статус тренировки. Смысл несёт слово, цвет только поддерживает; у части статусов есть значок. */
export function StatusBadge({ status, className }: Props) {
  return (
    <span className={cx(styles.badge, styles[status], className)}>
      {status === 'reviewed' && <Icon name="check" size={20} className={styles.icon} />}
      {status === 'moved' && <Icon name="arrowRight" size={20} className={styles.icon} />}
      {LABELS[status]}
    </span>
  );
}
