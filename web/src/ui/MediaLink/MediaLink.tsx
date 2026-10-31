import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import styles from './MediaLink.module.css';

type Props = {
  href: string;
  /** Длительность мм:сс */
  duration: string;
  /** Надстрочник: «Последнее видео · 12 окт» */
  eyebrow: string;
  title: string;
  className?: string;
};

/** Ссылка на видео подхода: превью с длительностью и подпись. */
export function MediaLink({ href, duration, eyebrow, title, className }: Props) {
  return (
    <a href={href} className={cx(styles.link, className)}>
      <span className={styles.thumb}>
        <span className={styles.play}>
          <Icon name="play" size={20} />
        </span>
        <span className={styles.duration}>{duration}</span>
      </span>
      <span className={styles.text}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <span className={styles.title}>{title}</span>
      </span>
    </a>
  );
}
