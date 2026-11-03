import type { MouseEvent } from 'react';
import type { AthleteRow } from '../../../../../shared/types';
import { Icon, Text } from '../../../ui';
import { goalText, initials, lastText } from '../students';
import styles from './AthleteHeader.module.css';

type Props = {
  today: string;
  athlete: AthleteRow;
  tab: 'sessions' | 'plan';
  backHref: string;
  onBack: () => void;
  onTab: (tab: 'sessions' | 'plan') => void;
};

/** Шапка карточки ученика: «Все ученики», имя, цель и вкладки «Тренировки» и «План». */
export function AthleteHeader({ today, athlete, tab, backHref, onBack, onTab }: Props) {
  const base = `/trainer/athletes/${athlete.id}`;
  return (
    <>
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
      <nav className={styles.tabs} aria-label="Разделы карточки ученика">
        {(['sessions', 'plan'] as const).map((t) => (
          <a
            key={t}
            className={styles.tab}
            href={t === 'plan' ? `${base}/plan` : base}
            aria-current={tab === t ? 'page' : undefined}
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              onTab(t);
            }}
          >
            {t === 'plan' ? 'План' : 'Тренировки'}
          </a>
        ))}
      </nav>
    </>
  );
}
