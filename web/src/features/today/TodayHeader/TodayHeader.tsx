import { StreakBadge } from '../../../ui';
import styles from './TodayHeader.module.css';

type Props = {
  /** «Суббота, 31 октября» */
  dateLabel: string;
  userName: string;
  streakWeeks: number;
};

export function TodayHeader({ dateLabel, userName, streakWeeks }: Props) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.date}>{dateLabel}</p>
        <h1 className={styles.title}>Привет, {userName}</h1>
      </div>
      {streakWeeks > 0 && <StreakBadge count={streakWeeks} unit="weeks" />}
    </header>
  );
}
