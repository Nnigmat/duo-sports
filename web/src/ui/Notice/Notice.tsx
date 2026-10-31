import type { ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './Notice.module.css';

type Props = {
  /** warn — предупреждение, success — действие выполнено, info — подсказка */
  tone?: 'info' | 'warn' | 'success';
  /** Свой знак; по умолчанию по тону */
  icon?: IconName;
  /** Кнопка справа или под текстом, например «Открыть день» */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

const defaultIcon: Record<NonNullable<Props['tone']>, IconName> = { info: 'info', warn: 'warning', success: 'check' };

/** Короткое сообщение со знаком и текстом; тон не передаётся одним цветом. */
export function Notice({ tone = 'info', icon, action, className, children }: Props) {
  return (
    <div role="status" className={cx(styles.root, styles[tone], className)}>
      <Icon name={icon ?? defaultIcon[tone]} size={20} className={styles.icon} />
      <span className={styles.text}>{children}</span>
      {action}
    </div>
  );
}
