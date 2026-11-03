import { useId, useState } from 'react';
import { Badge, Button, Icon, Text } from '../../../ui';
import { plural } from '../../workout/flow/ru';
import { diffSession, firstUseWeek, previousSession, renamedNames, sessionChip, sessionItems, skippedNames, visibleBlocks, weekNotes, weekSummary } from '../preview';
import type { ExerciseChoices, NewExercise, PreviewWeek } from '../types';
import styles from './WeeksSection.module.css';

type Props = {
  weeks: PreviewWeek[];
  note: string;
  newExercises: NewExercise[];
  choices: ExerciseChoices;
};

const TONE = { past: 'neutral', changed: 'highlight', new: 'accent', same: 'neutral' } as const;

/** Тренировки по неделям: неделя раскрывается, в ней — тренировки с изменениями к прошлой неделе. */
export function WeeksSection({ weeks, note, newExercises, choices }: Props) {
  const uid = useId();
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => new Set([0, 3]));
  const [openSession, setOpenSession] = useState<string | null>('3-0');
  const allOpen = openWeeks.size === weeks.length;
  const skipped = skippedNames(newExercises, choices);
  const renamed = renamedNames(newExercises, choices);
  const shown = (name: string) => renamed.get(name) ?? name;
  // Заменённые существующим упражнением уже не новые
  const newNames = new Set(newExercises.filter((e) => !renamed.has(e.name)).map((e) => e.name));

  const toggleWeek = (i: number) =>
    setOpenWeeks((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className={styles.root} aria-labelledby={`${uid}-title`}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <Text variant="h3" tag="h2" id={`${uid}-title`}>
            Тренировки по неделям
          </Text>
          <Text variant="body-sm" color="slate">
            {note}
          </Text>
        </div>
        <Button variant="secondary" compact onClick={() => setOpenWeeks(allOpen ? new Set() : new Set(weeks.map((_, i) => i)))}>
          {allOpen ? 'Свернуть все' : 'Развернуть все'}
        </Button>
      </div>

      <ul className={styles.weeks}>
        {weeks.map((w, wi) => {
          const open = openWeeks.has(wi);
          const notes = weekNotes(w);
          return (
            <li key={w.range} className={styles.week}>
              <button
                type="button"
                className={styles.weekHead}
                aria-expanded={open}
                aria-controls={`${uid}-w${wi}`}
                onClick={() => toggleWeek(wi)}
              >
                <Icon name="forward" size={20} className={styles.chev} />
                <span className={styles.weekTitle}>
                  <span className={styles.weekName}>
                    Неделя {wi + 1} · {w.range}
                  </span>
                  <span className={styles.weekSummary}>{weekSummary(w)}</span>
                </span>
                {w.sessions[0]?.past && <Badge tone="neutral">в прошлом</Badge>}
                {notes > 0 && <Badge tone="highlight">{`${notes} ${plural(notes, ['замечание', 'замечания', 'замечаний'])}`}</Badge>}
              </button>
              {open && (
                <ul id={`${uid}-w${wi}`} className={styles.sessions}>
                  {w.sessions.map((s, si) => {
                    const diff = diffSession(previousSession(weeks, wi, si), s);
                    const chip = sessionChip(s, diff);
                    const items = sessionItems(s, skipped);
                    const isOpen = openSession === s.id;
                    return (
                      <li key={s.id} className={styles.session}>
                        <button
                          type="button"
                          className={styles.sessionHead}
                          aria-expanded={isOpen}
                          aria-controls={`${uid}-s${s.id}`}
                          onClick={() => setOpenSession(isOpen ? null : s.id)}
                        >
                          <span className={styles.sessionTitle}>
                            <span className={styles.date}>{s.date}</span>
                            <span className={styles.name}>{s.title}</span>
                            <span className={styles.meta}>{items.map((i) => shown(i.name)).join(', ')}</span>
                          </span>
                          <Badge tone={TONE[chip.tone]}>{chip.text}</Badge>
                          <Icon name="forward" size={20} className={isOpen ? `${styles.chevSession} ${styles.chevOpen}` : styles.chevSession} />
                        </button>
                        {isOpen && (
                          <div id={`${uid}-s${s.id}`} className={styles.detail}>
                            {s.note && <p className={styles.noteLine}>{s.note}</p>}
                            {visibleBlocks(s, skipped).map((b, bi) => (
                              <div key={bi} className={styles.block}>
                                <h3 className={styles.part}>{b.heading}</h3>
                                {b.text && <p className={styles.text}>{b.text}</p>}
                                {b.items.length > 0 && (
                                  <ol className={styles.items}>
                                    {b.items.map((x) => (
                                      <li key={x.name} className={styles.item}>
                                        <span className={styles.itemName}>
                                          {shown(x.name)}
                                          {newNames.has(x.name) && firstUseWeek(weeks, x.name) === wi && (
                                            <>
                                              {' '}
                                              <a href="#new-ex">новое упражнение</a>
                                            </>
                                          )}
                                        </span>
                                        <span className={styles.value} data-changed={diff.old[x.name] !== undefined || undefined}>
                                          {diff.old[x.name] !== undefined && <s className={styles.old}>{diff.old[x.name]}</s>}
                                          {diff.old[x.name] !== undefined && <span className={styles.sr}> заменено на </span>}
                                          {x.value}
                                        </span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
