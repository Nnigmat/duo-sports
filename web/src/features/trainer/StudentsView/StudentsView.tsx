import type { MouseEvent } from 'react';
import type { AthleteListResponse, AthleteRow } from '../../../../../shared/types';
import { cx } from '../../../ui/cx';
import { formatLongDate } from '../../workout/flow/ru';
import { parseIso } from '../../plan/plan';
import { Chip, ChipGroup, EmptyState, Icon, ProgressBar, SearchField, Text } from '../../../ui';
import { avatarTone, badgeText, emptyText, FILTERS, goalText, initials, lastText, summaryText, weekAria, weekText, type AthleteFilter } from '../students';
import styles from './StudentsView.module.css';

type Props = {
  /** Сегодня у клиента, «2026-11-03» */
  today: string;
  athletes: AthleteRow[];
  counts: AthleteListResponse['counts'];
  filter: AthleteFilter;
  onFilterChange: (filter: AthleteFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  athleteHref: (id: number) => string;
  onOpenAthlete: (id: number) => void;
};

/** Экран «Ученики» кабинета тренера: поиск, фильтры со счётчиками, строки учеников. Фильтр и поиск считает сервер. */
export function StudentsView({ today, athletes, counts, filter, onFilterChange, query, onQueryChange, athleteHref, onOpenAthlete }: Props) {
  const empty = emptyText(filter, query);
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Text variant="eyebrow">{formatLongDate(parseIso(today))}</Text>
        <Text variant="h1" tag="h1">
          Ученики
        </Text>
        <p className={styles.summary}>{summaryText(counts)}</p>
      </header>

      <div className={styles.tools}>
        <SearchField label="Поиск по ученикам" placeholder="Найти ученика" value={query} onValueChange={onQueryChange} className={styles.search} />
        <ChipGroup label="Фильтр">
          {FILTERS.map((f) => (
            <Chip key={f.key} pressed={filter === f.key} count={counts[f.key]} onClick={() => onFilterChange(f.key)}>
              {f.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      {athletes.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} className={styles.empty} />
      ) : (
        <ul className={styles.list} aria-label="Список учеников">
          {athletes.map((a) => (
            <li key={a.id}>
              <a
                className={styles.row}
                href={athleteHref(a.id)}
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  onOpenAthlete(a.id);
                }}
              >
                <span className={styles.who}>
                  <span className={cx(styles.avatar, styles[avatarTone(a.status)])} aria-hidden="true">
                    {initials(a.name || a.email)}
                  </span>
                  <span className={styles.whoText}>
                    <span className={styles.name}>{a.name || a.email}</span>
                    <span className={styles.goal}>{goalText(a.goal)}</span>
                  </span>
                </span>
                <span className={styles.last}>
                  <span className={styles.label}>Последняя тренировка</span>
                  <span>{lastText(a.lastSession, today)}</span>
                </span>
                <span className={styles.week}>
                  <span className={styles.label}>
                    За 7 дней · <span className={styles.weekValue}>{weekText(a)}</span>
                  </span>
                  <ProgressBar label={weekAria(a)} value={a.done7} max={Math.max(a.planned7, 1)} valueText={weekText(a)} className={cx(styles.bar, a.status === 'inactive' && styles.barMuted)} />
                </span>
                <span className={styles.end}>
                  <span className={cx(styles.badge, styles[`badge_${a.status}`])}>
                    {a.status === 'review' && <Icon name="video" size={20} />}
                    {a.status === 'inactive' && <Icon name="clock" size={20} />}
                    {a.status === 'ok' && <Icon name="check" size={20} />}
                    {badgeText(a)}
                  </span>
                  <Icon name="chevronRight" size={20} className={styles.chevron} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
