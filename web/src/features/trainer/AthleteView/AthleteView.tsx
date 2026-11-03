import type { ReactNode } from 'react';
import type { AthleteRow, AthleteSessionsResponse } from '../../../../../shared/types';
import { Button } from '../../../ui';
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
  /** Узкий экран: открыта тренировка вместо списка. На широком обе колонки видны всегда */
  open: boolean;
  onClose: () => void;
};

/**
 * Карточка ученика, вкладка «Тренировки»: слева «Запланировано» и «История», справа выбранная тренировка.
 * На телефоне сначала список на всю ширину, выбранная тренировка открывается вместо него с кнопкой «← Тренировки».
 */
export function AthleteView({ today, athlete, sessions, selection, onSelect, backHref, onBack, onTab, detail, open, onClose }: Props) {
  return (
    <div className={styles.root} data-open={open}>
      <div className={styles.header}>
        <AthleteHeader today={today} athlete={athlete} tab="sessions" backHref={backHref} onBack={onBack} onTab={onTab} />
      </div>
      <div className={styles.back}>
        <Button variant="ghost" compact icon="back" onClick={onClose}>
          Тренировки
        </Button>
      </div>

      <div className={styles.columns}>
        <div className={styles.list}>
          <SessionsPanel today={today} sessions={sessions} selection={selection} onSelect={onSelect} />
        </div>
        <div className={styles.detail}>{detail}</div>
      </div>
    </div>
  );
}
