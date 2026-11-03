import { useState } from 'react';
import type { AthleteSessionsResponse } from '../../../../../shared/types';
import { Button, Icon, StatusBadge, Text } from '../../../ui';
import { cx } from '../../../ui/cx';
import { groupByMonth, HISTORY_PAGE, historyBadge, historyMeta, movedText, plannedBadge, plannedMeta, rowDate, sameSelection, type Selection } from '../sessions';
import styles from './SessionsPanel.module.css';

type Props = {
  today: string;
  sessions: AthleteSessionsResponse;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
};

/** Слева в карточке ученика: «Запланировано» и «История тренировок». Перенесённые на другой день показаны пунктиром и не открываются. */
export function SessionsPanel({ today, sessions, selection, onSelect }: Props) {
  const [shown, setShown] = useState(HISTORY_PAGE);
  const months = groupByMonth(sessions.history, shown, today);
  return (
    <section className={styles.root} aria-label="Тренировки ученика">
      <div className={styles.group}>
        <Text variant="h5" tag="h2">
          Запланировано
        </Text>
        {sessions.planned.length === 0 && <p className={styles.empty}>Ничего не запланировано</p>}
        {sessions.planned.map((p) => {
          const moved = movedText(p);
          if (p.kind === 'moved') {
            return (
              <div key={`${p.date}:${p.workoutId}`} className={styles.movedRow}>
                <span className={styles.date}>{rowDate(p.date, today)}</span>
                <span className={styles.title}>{p.title}</span>
                <span className={styles.movedNote}>
                  <Icon name="arrowRight" size={20} />
                  {moved}
                </span>
              </div>
            );
          }
          const sel: Selection = { kind: 'plan', date: p.date, workoutId: p.workoutId };
          return (
            <button key={`${p.date}:${p.workoutId}`} type="button" className={cx(styles.row, sameSelection(selection, sel) && styles.on)} aria-pressed={sameSelection(selection, sel)} onClick={() => onSelect(sel)}>
              <span className={styles.date}>{rowDate(p.date, today)}</span>
              <span className={styles.title}>{p.title}</span>
              <span className={styles.meta}>{plannedMeta(p)}</span>
              <span className={styles.badges}>
                <StatusBadge status={plannedBadge(p, today)} />
                {moved && <span className={styles.movedNote}>{moved}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.group}>
        <Text variant="h5" tag="h2">
          История тренировок
        </Text>
        {sessions.history.length === 0 && <p className={styles.empty}>Тренировок пока не было</p>}
        {months.map((m) => (
          <div key={m.key} className={styles.month}>
            <h3 className={styles.monthTitle}>{m.label}</h3>
            {m.items.map((h) => {
              const sel: Selection = { kind: 'session', sessionId: h.sessionId };
              const moved = movedText(h);
              return (
                <button key={h.sessionId} type="button" className={cx(styles.row, sameSelection(selection, sel) && styles.on)} aria-pressed={sameSelection(selection, sel)} onClick={() => onSelect(sel)}>
                  <span className={styles.date}>{rowDate(h.date, today)}</span>
                  <span className={styles.title}>{h.title}</span>
                  <span className={styles.meta}>{historyMeta(h)}</span>
                  <span className={styles.badges}>
                    <StatusBadge status={historyBadge(h)} />
                    {h.newFromAthlete > 0 && <span className={styles.fromAthlete}>{h.newFromAthlete === 1 ? 'Новое от ученика' : `Новых от ученика: ${h.newFromAthlete}`}</span>}
                    {moved && <span className={styles.movedNote}>{moved}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        {sessions.history.length > shown && (
          <Button variant="secondary" fullWidth onClick={() => setShown((n) => n + HISTORY_PAGE)}>
            Показать ещё
          </Button>
        )}
      </div>
    </section>
  );
}
