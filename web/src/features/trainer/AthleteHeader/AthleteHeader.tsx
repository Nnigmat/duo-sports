import type { MouseEvent } from 'react';
import type { AthleteRow } from '../../../../../shared/types';
import { Icon, Text } from '../../../ui';
import { goalText, initials, lastText } from '../students';
import styles from './AthleteHeader.module.css';

export type AthleteTab = 'sessions' | 'plan' | 'measurements';

const TABS: Array<{ tab: AthleteTab; label: string; path: string }> = [
  { tab: 'sessions', label: 'Тренировки', path: '' },
  { tab: 'plan', label: 'План', path: '/plan' },
  { tab: 'measurements', label: 'Замеры', path: '/measurements' },
];

/** Адрес вкладки карточки ученика */
export const athleteTabPath = (athleteId: number, tab: AthleteTab): string =>
  `/trainer/athletes/${athleteId}${TABS.find((t) => t.tab === tab)?.path ?? ''}`;

type Props = {
  today: string;
  athlete: AthleteRow;
  tab: AthleteTab;
  backHref: string;
  onBack: () => void;
  onTab: (tab: AthleteTab) => void;
};

/** Шапка карточки ученика: «Все ученики», имя, цель и вкладки «Тренировки», «План» и «Замеры». */
export function AthleteHeader({ today, athlete, tab, backHref, onBack, onTab }: Props) {
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
        {TABS.map((t) => (
          <a
            key={t.tab}
            className={styles.tab}
            href={athleteTabPath(athlete.id, t.tab)}
            aria-current={tab === t.tab ? 'page' : undefined}
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              onTab(t.tab);
            }}
          >
            {t.label}
          </a>
        ))}
      </nav>
    </>
  );
}
