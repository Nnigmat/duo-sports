import { useState } from 'react';
import type { CoachComment } from '../../../../../../shared/types';
import { Badge } from '../../../../ui/Badge/Badge';
import { Button } from '../../../../ui/Button/Button';
import { Chip } from '../../../../ui/Chip/Chip';
import { Icon } from '../../../../ui/Icon/Icon';
import { Sheet } from '../../../../ui/Sheet/Sheet';
import { Text } from '../../../../ui/Text/Text';
import { commentsFor, formatCommentDate, sortComments } from '../../flow';
import styles from './CommentsSheet.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задано, слева от названия стоит «Назад» (например, к технике) */
  onBack?: () => void;
  exerciseId: string;
  exerciseName: string;
  comments: CoachComment[];
  /** Есть более ранние комментарии, которых ещё нет в списке */
  hasMore?: boolean;
  onLoadMore?: () => void;
  onOpenVideo?: (videoId: string) => void;
  /** Для дат; в приложении не передаётся */
  now?: Date;
};

type Scope = 'exercise' | 'all';

export function CommentsSheet(props: Props) {
  const { open, onOpenChange, onBack } = props;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} onBack={onBack} title="Комментарии тренера" tall>
      <CommentsBody {...props} />
    </Sheet>
  );
}

function CommentsBody({ exerciseId, exerciseName, comments, hasMore, onLoadMore, onOpenVideo, now = new Date() }: Props) {
  const [scope, setScope] = useState<Scope>('exercise');
  const own = commentsFor(comments, exerciseId);
  const shown = sortComments(scope === 'exercise' ? own : comments);

  return (
    <>
      <Text variant="caption">Сначала новые</Text>

      <div role="group" aria-label="Какие комментарии показать" className={styles.filters}>
        <Chip pressed={scope === 'exercise'} onClick={() => setScope('exercise')}>
          {exerciseName} · {own.length}
        </Chip>
        <Chip pressed={scope === 'all'} onClick={() => setScope('all')}>
          Все · {comments.length}
        </Chip>
      </div>

      {shown.length === 0 ? (
        <Text variant="body-sm" color="slate">
          Комментариев пока нет
        </Text>
      ) : (
        <ul className={styles.list}>
          {shown.map((c) => (
            <li key={c.id} className={styles.item}>
              <div className={styles.meta}>
                <Text variant="caption" tag="span">
                  {formatCommentDate(c.createdAt, now)}
                </Text>
                {scope === 'all' && (
                  <>
                    <Text variant="caption" tag="span" aria-hidden="true">
                      ·
                    </Text>
                    <Text variant="caption" tag="span" className={styles.exercise}>
                      {c.exerciseName}
                    </Text>
                  </>
                )}
                {c.isNew && <Badge className={styles.badge}>Новый</Badge>}
              </div>
              <p className={styles.text}>{c.text}</p>
              {c.video && (
                <button type="button" className={styles.video} onClick={() => onOpenVideo?.(c.video!.id)}>
                  <span className={styles.thumb} aria-hidden="true">
                    <Icon name="play" size={20} />
                  </span>
                  {c.video.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button variant="secondary" compact fullWidth onClick={onLoadMore}>
          Показать более ранние
        </Button>
      )}
    </>
  );
}
