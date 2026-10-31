import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './Button.module.css';

type Common = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** 44 px вместо 52 px */
  compact?: boolean;
  /** Иконка слева от текста */
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & { href?: undefined };
type AsLink = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Common> & { href: string };

export function Button(props: AsButton | AsLink) {
  const {
    variant = 'primary',
    compact,
    icon,
    loading,
    disabled,
    fullWidth,
    className,
    children,
    ...rest
  } = props;
  const inactive = disabled || loading;
  const cls = cx(
    styles.root,
    styles[variant],
    compact && styles.compact,
    fullWidth && styles.full,
    loading && styles.loading,
    className,
  );
  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon && <Icon name={icon} size={20} />}
      {children}
    </>
  );

  if ('href' in rest && rest.href !== undefined) {
    const { href, onClick, ...anchor } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        {...anchor}
        href={inactive ? undefined : href}
        role={inactive ? 'link' : undefined}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        onClick={inactive ? (e) => e.preventDefault() : onClick}
        className={cls}
      >
        {content}
      </a>
    );
  }

  const { type = 'button', ...button } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...button} type={type} disabled={inactive} aria-busy={loading || undefined} className={cls}>
      {content}
    </button>
  );
}
