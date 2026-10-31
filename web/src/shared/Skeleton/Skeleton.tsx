import styles from './Skeleton.module.css';

type Props = {
  height?: number;
  className?: string;
};

/** Заглушка на месте будущей вёрстки; для скринридера не читается. */
export function Skeleton({ height = 120, className }: Props) {
  return <div aria-hidden="true" className={[styles.box, className].filter(Boolean).join(' ')} style={{ height }} />;
}
