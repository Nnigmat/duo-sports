import { Badge, Button, Card, CommentBubble, EmptyState, MediaLink, SegmentedControl, Text, TopBar } from '../../../ui';
import { hiddenSessions, historySubtitle, sessionSummary, setText, sortSessions, type HistorySort } from '../library';
import type { LibraryExercise } from '../types';
import styles from './ExerciseHistoryView.module.css';

type Props = {
  exercise: LibraryExercise;
  sort: HistorySort;
  onSortChange: (sort: HistorySort) => void;
  onBack: () => void;
  onShowMore?: () => void;
};

/** «Все тренировки» по упражнению: подходы, видео и комментарии тренера. */
export function ExerciseHistoryView({ exercise: ex, sort, onSortChange, onBack, onShowMore }: Props) {
  const sessions = sortSessions(ex.sessions, sort);
  const hidden = hiddenSessions(ex);

  return (
    <div className={styles.root}>
      <TopBar start={<Button variant="ghost" compact icon="back" onClick={onBack}>Упражнение</Button>} />
      <div className={styles.body}>
        <div className={styles.titles}>
          <Text variant="h3" tag="h1">Все тренировки</Text>
          <Text variant="body-sm" color="steel">{historySubtitle(ex)}</Text>
        </div>

        <SegmentedControl
          label="Сортировка тренировок"
          value={sort}
          onChange={onSortChange}
          options={[
            { value: 'new', label: 'Сначала новые' },
            { value: 'old', label: 'Сначала старые' },
          ]}
        />

        <ol className={styles.list}>
          {sessions.map((s) => (
            <li key={s.date}>
              <Card tone="canvas" className={styles.session}>
                <div className={styles.head}>
                  <Text variant="h5" tag="h2">{s.date}</Text>
                  {s.isRecord && <Badge tone="highlight">рекорд</Badge>}
                  <Text variant="caption" className={styles.summary}>{sessionSummary(ex.kind, s.sets)}</Text>
                </div>
                <ul className={styles.sets} aria-label="Подходы">
                  {s.sets.map((set, i) => (
                    <li key={i} className={styles.set}>{setText(ex.kind, set, ex.pair)}</li>
                  ))}
                </ul>
                {s.videos.map((v) => (
                  <MediaLink key={v.title} href="#video" duration={v.duration} eyebrow="Видео" title={v.title} />
                ))}
                {s.comments.map((c) => (
                  <CommentBubble key={c.text} author={c.author} text={c.text} />
                ))}
              </Card>
            </li>
          ))}
        </ol>

        {sessions.length === 0 && <EmptyState title="Пока нет ни одной тренировки с этим упражнением." />}
        {hidden > 0 && onShowMore && (
          <Button variant="secondary" fullWidth onClick={onShowMore}>{`Показать ещё ${hidden}`}</Button>
        )}
      </div>
    </div>
  );
}
