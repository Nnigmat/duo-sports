import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Text.module.css';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'eyebrow';

type Props = Omit<HTMLAttributes<HTMLElement>, 'color' | 'children'> & {
  variant?: TextVariant;
  /** Без color текст наследует цвет; eyebrow и caption по умолчанию steel. */
  color?: 'ink' | 'slate' | 'steel';
  /** Тег по смыслу страницы; по умолчанию — подходящий варианту. */
  tag?: ElementType;
  className?: string;
  children: ReactNode;
};

const defaultTag: Record<TextVariant, ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  eyebrow: 'span',
};

export function Text({ variant = 'body', color, tag, className, children, ...rest }: Props) {
  const Tag = tag ?? defaultTag[variant];
  return (
    <Tag {...rest} className={cx(styles[variant], color && styles[color], className)}>
      {children}
    </Tag>
  );
}
