import type { AwaitingReview } from '../../../../../shared/types';
import { videosSentText } from '../../../shared/format';
import { Icon } from '../../../ui';
import styles from './AwaitingCard.module.css';

type Props = { awaiting: AwaitingReview };

/** «Всё тело, вчера · 2 видео отправлены, тренер ещё не посмотрел» */
export function AwaitingCard({ awaiting }: Props) {
  return (
    <p className={styles.root}>
      <Icon name="clock" size={20} />
      <span>
        <strong className={styles.title}>
          {awaiting.title}, {awaiting.whenLabel}
        </strong>{' '}
        · {videosSentText(awaiting.videos)}, тренер ещё не посмотрел
      </span>
    </p>
  );
}
