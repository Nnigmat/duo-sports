import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './IconButton.module.css';

type Common = {
  /** Обязателен. Если есть badge — назовите состояние в подписи («Техника, новый комментарий»). */
  'aria-label': string;
  icon?: IconName;
  /** Вместо иконки (например, «+15») */
  children?: ReactNode;
  /** sm 48, md 56, lg 88 (заливка primary, подпись внутри) */
  size?: 'sm' | 'md' | 'lg';
  /** Прозрачная 44 px кнопка для шапки */
  bare?: boolean;
  /** Подпись: под кнопкой (sm, md) или внутри (lg) */
  caption?: string;
  /** Точка «есть новое» */
  badge?: boolean;
  /** Обводка и кольцо primary */
  active?: boolean;
  className?: string;
};

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & { href?: undefined };
type AsLink = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Common> & { href: string };

export function IconButton(props: AsButton | AsLink) {
  const { icon, children, size = 'sm', bare, caption, badge, active, className, ...rest } = props;
  const lg = size === 'lg' && !bare;
  const wrapped = !bare && !lg && !!caption;
  const cls = cx(
    styles.root,
    bare ? styles.bare : styles[size],
    active && styles.active,
    !wrapped && className,
  );
  const glyph = children ?? (icon && <Icon name={icon} size={lg ? 24 : 20} />);
  const inner = (
    <>
      {glyph}
      {lg && caption && <span className={styles.inner}>{caption}</span>}
      {badge && <span className={styles.badge} aria-hidden="true" />}
    </>
  );

  const control =
    'href' in rest && rest.href !== undefined ? (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={cls}>
        {inner}
      </a>
    ) : (
      <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={cls}>
        {inner}
      </button>
    );

  if (!wrapped) return control;
  return (
    <span className={cx(styles.wrap, className)}>
      {control}
      <span className={cx(styles.caption, active && styles.captionActive)} aria-hidden="true">
        {caption}
      </span>
    </span>
  );
}
