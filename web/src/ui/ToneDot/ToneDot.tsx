import { cx } from '../cx';
import styles from './ToneDot.module.css';

export type Tone = 'primary' | 'teal' | 'amber' | 'slate';

type Props = {
  tone: Tone;
  className?: string;
};

/** Цветная точка-метка типа. Декоративная: смысл всегда несёт название рядом. */
export function ToneDot({ tone, className }: Props) {
  return <span aria-hidden="true" className={cx(styles.dot, styles[tone], className)} />;
}
