import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Card.module.css';

type Common = {
  /** canvas — рамка hairline-soft; surface — тонированная панель с рамкой hairline */
  tone?: 'canvas' | 'surface';
  className?: string;
  children: ReactNode;
};

type AsDiv = Common & Omit<HTMLAttributes<HTMLDivElement>, keyof Common> & { href?: undefined; onClick?: undefined };
type AsLink = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Common> & { href: string };
type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & { href?: undefined; onClick: () => void };

/** Карточка; с href — ссылка, с onClick — кнопка, иначе обычный блок. */
export function Card(props: AsDiv | AsLink | AsButton) {
  const { tone = 'canvas', className, children, ...rest } = props;
  const base = cx(styles.card, styles[tone], className);

  if ('href' in rest && rest.href !== undefined) {
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={cx(base, styles.interactive)}>
        {children}
      </a>
    );
  }
  if (rest.onClick) {
    return (
      <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={cx(base, styles.interactive)}>
        {children}
      </button>
    );
  }
  return (
    <div {...(rest as HTMLAttributes<HTMLDivElement>)} className={base}>
      {children}
    </div>
  );
}
