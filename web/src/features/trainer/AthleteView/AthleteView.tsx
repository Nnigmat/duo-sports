import type { ReactNode } from 'react';
import type { AthleteRow, AthleteSessionsResponse } from '../../../../../shared/types';
import { AthleteHeader } from '../AthleteHeader/AthleteHeader';
import { SessionsPanel } from '../SessionsPanel/SessionsPanel';
import type { Selection } from '../sessions';
import styles from './AthleteView.module.css';

type Props = {
  today: string;
  athlete: AthleteRow;
  sessions: AthleteSessionsResponse;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  backHref: string;
  onBack: () => void;
  onTab: (tab: 'sessions' | 'plan') => void;
  /** Выбранная тренировка по шагам: ReviewDetail, PlannedDetail или заглушка загрузки */
  detail: ReactNode;
};

/** Карточка ученика, вкладка «Тренировки»: слева «Запланировано» и «История», справа выбранная тренировка. */
export function AthleteView({ today, athlete, sessions, selection, onSelect, backHref, onBack, onTab, detail }: Props) {
  return (
    <div className={styles.root}>
      <AthleteHeader today={today} athlete={athlete} tab="sessions" backHref={backHref} onBack={onBack} onTab={onTab} />

      <div className={styles.columns}>
        <div className={styles.list}>
          <SessionsPanel today={today} sessions={sessions} selection={selection} onSelect={onSelect} />
        </div>
        <div className={styles.detail}>{detail}</div>
      </div>
    </div>
  );
}
