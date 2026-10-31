import type { ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './ListRow.module.css';

type Common = {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Строка меток под подзаголовком: Badge, «Рекорд · 60 кг × 10» */
  meta?: ReactNode;
  /** Колонка справа перед шевроном: рекорд на широком экране */
  aside?: ReactNode;
  /** С href — ссылка, иначе кнопка */
  href?: string;
  onClick?: () => void;
  className?: string;
};

type Props = Common;

/** Строка списка: плитка с иконкой, название, подзаголовок, метки и шеврон. Кнопка или ссылка целиком. */
export function ListRow({ icon, title, subtitle, meta, aside, className, href, onClick }: Props) {
  const content = (
    <>
      <span className={styles.tile}>
        <Icon name={icon} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {aside && <span className={styles.aside}>{aside}</span>}
      <Icon name="chevronRight" className={styles.chevron} />
    </>
  );
  return href !== undefined ? (
    <a href={href} className={cx(styles.row, className)}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cx(styles.row, className)}>
      {content}
    </button>
  );
}
