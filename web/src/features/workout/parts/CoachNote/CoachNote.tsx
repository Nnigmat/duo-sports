import { cx } from '../../../../ui/cx';
import { Icon } from '../../../../ui/Icon/Icon';
import styles from './CoachNote.module.css';

type Props = {
  /** Последний комментарий тренера */
  text: string;
  /** Открыть все комментарии */
  onOpen: () => void;
  className?: string;
};

/** Карточка под чибиком: последний комментарий тренера, до 3 строк. */
export function CoachNote({ text, onOpen, className }: Props) {
  return (
    <button type="button" className={cx(styles.root, className)} onClick={onOpen}>
      <span className={styles.srOnly}>Комментарий тренера, открыть все: </span>
      <span className={styles.text}>{text}</span>
      <Icon name="chevronRight" size={20} className={styles.chevron} />
    </button>
  );
}
