import type { MouseEvent, ReactNode } from 'react';
import type { AthleteRow, AthleteSessionsResponse } from '../../../../../shared/types';
import { Icon, Text } from '../../../ui';
import { SessionsPanel } from '../SessionsPanel/SessionsPanel';
import type { Selection } from '../sessions';
import { goalText, initials, lastText } from '../students';
import styles from './AthleteView.module.css';

type Props = {
  today: string;
  athlete: AthleteRow;
  sessions: AthleteSessionsResponse;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  backHref: string;
  onBack: () => void;
  /** Выбранная тренировка по шагам: ReviewDetail, PlannedDetail или заглушка загрузки */
  detail: ReactNode;
};

/** Карточка ученика, вкладка «Тренировки»: слева «Запланировано» и «История», справа выбранная тренировка. */
export function AthleteView({ today, athlete, sessions, selection, onSelect, backHref, onBack, detail }: Props) {
  return (
    <div className={styles.root}>
      <a
        className={styles.back}
        href={backHref}
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          onBack();
        }}
      >
        <Icon name="back" size={20} />
        Все ученики
      </a>
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(athlete.name || athlete.email)}
        </span>
        <div className={styles.who}>
          <Text variant="h1" tag="h1">
            {athlete.name || athlete.email}
          </Text>
          <span className={styles.goal}>{goalText(athlete.goal)}</span>
        </div>
        <span className={styles.last}>{athlete.lastSession ? `Последняя тренировка: ${lastText(athlete.lastSession, today)}` : 'Тренировок ещё не было'}</span>
      </header>

      <div className={styles.columns}>
        <div className={styles.list}>
          <SessionsPanel today={today} sessions={sessions} selection={selection} onSelect={onSelect} />
        </div>
        <div className={styles.detail}>{detail}</div>
      </div>
    </div>
  );
}
