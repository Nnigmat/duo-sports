import type { MouseEventHandler } from 'react';
import { Icon, StreakBadge } from '../../../ui';
import styles from './TodayHeader.module.css';

type Props = {
  /** «Суббота, 31 октября» */
  dateLabel: string;
  userName: string;
  streakWeeks: number;
  /** Колокольчик ведёт к последнему разбору; без ссылки его нет, нажимать было бы нечего */
  bell?: { href: string; unread: number; onClick?: MouseEventHandler<HTMLAnchorElement> };
};

export function TodayHeader({ dateLabel, userName, streakWeeks, bell }: Props) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.date}>{dateLabel}</p>
        <h1 className={styles.title}>Привет, {userName}</h1>
      </div>
      <div className={styles.aside}>
        {streakWeeks > 0 && <StreakBadge count={streakWeeks} unit="weeks" />}
        {bell && (
        <a className={styles.bell} href={bell.href} onClick={bell.onClick} aria-label={bell.unread > 0 ? `Уведомления, ${bell.unread} новое` : 'Уведомления'}>
          <Icon name="bell" size={20} />
          {bell.unread > 0 && <span className={styles.dot} aria-hidden="true" />}
        </a>
        )}
      </div>
    </header>
  );
}
