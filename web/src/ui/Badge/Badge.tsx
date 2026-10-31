import { cx } from '../cx';
import styles from './Badge.module.css';

type Props = {
  /** Всегда слово («Новый», «Пропущен»): цвет сам смысла не несёт */
  children: string;
  tone?: 'accent' | 'neutral' | 'highlight' | 'primary';
  className?: string;
};

export function Badge({ children, tone = 'accent', className }: Props) {
  return <span className={cx(styles.badge, styles[tone], className)}>{children}</span>;
}
