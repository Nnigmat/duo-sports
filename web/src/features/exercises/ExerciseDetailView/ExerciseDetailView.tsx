import type { ReactNode } from 'react';
import { pickDemo } from '../../../../../shared/demo';
import type { Gender } from '../../../../../shared/types';
import { useMediaQuery } from '../../../shared';
import { Badge, BarChart, Button, CommentBubble, EmptyState, Icon, MediaLink, StatTile, Text, TopBar } from '../../../ui';
import {
  barsNote, KIND_INFO, lastSessionRows, latestMedia, mediaCountText, noteSteps, recordTiles, trendInfo,
} from '../library';
import type { LibraryExercise } from '../types';
import styles from './ExerciseDetailView.module.css';

type Props = {
  exercise: LibraryExercise;
  onBack: () => void;
  /** Нет — кнопки «Редактировать» нет (только чтение) */
  onEdit?: () => void;
  onOpenHistory: () => void;
  onAddVideo?: () => void;
  /** Подпись кнопки назад; на десктопе «Все упражнения» */
  backLabel?: string;
  /** Заменяет шапку, например при редактировании */
  topBar?: ReactNode;
  /** Пол пользователя: по нему выбирается ролик техники */
  gender?: Gender;
};

/** Карточка упражнения: тип, мышцы, рекорд, последняя тренировка, видео и комментарии, график. */
export function ExerciseDetailView({ exercise: ex, onBack, onEdit, onOpenHistory, onAddVideo, backLabel = 'Упражнения', topBar, gender }: Props) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const demoFile = pickDemo(gender, ex.demo);
  const tiles = recordTiles(ex);
  const rows = lastSessionRows(ex);
  const note = barsNote(ex);
  const media = latestMedia(ex);
  const trend = trendInfo(ex);
  const hasHistory = ex.sessionsTotal > 0;
  const hasMedia = !!(media.video || media.comment);
  const last = ex.sessions[0];
  const steps = noteSteps(ex.notes);
  const coach = ex.coachComments ?? [];

  return (
    <div className={styles.root}>
      {topBar ?? (
        <TopBar
          start={<Button variant="ghost" compact icon="back" onClick={onBack}>{backLabel}</Button>}
          end={onEdit && <Button variant="ghost" compact icon="pencil" onClick={onEdit}>Редактировать</Button>}
        />
      )}

      <div className={styles.body}>
        <figure className={styles.figure}>
          {demoFile ? (
            // Превью зациклено и без звука; при reduced motion стоит на первом кадре
            <video
              key={demoFile}
              className={styles.demo}
              src={`/api/demo/${demoFile}`}
              muted
              loop
              playsInline
              autoPlay={!still}
              controls={still}
              preload="metadata"
              aria-label={`Видео техники: ${ex.name}`}
            />
          ) : (
            <>
              <Icon name="video" />
              <figcaption className={styles.caption}>Видео техники не добавлено</figcaption>
            </>
          )}
          {onAddVideo && (
            <Button variant="secondary" compact icon="upload" onClick={onAddVideo}>
              {ex.demo ? 'Заменить видео' : 'Добавить видео'}
            </Button>
          )}
        </figure>

        <div className={styles.info}>
        <div className={styles.head}>
          <Text variant="h3" tag="h1">{ex.name}</Text>
          <span className={styles.kind}>
            <Icon name={KIND_INFO[ex.kind].icon} size={20} />
            {KIND_INFO[ex.kind].name}
          </span>
          <ul className={styles.tags} aria-label="Мышцы и снаряд">
            {ex.muscles.map((m) => (
              <li key={m}><Badge tone="neutral">{m}</Badge></li>
            ))}
            <li><Badge tone="neutral">{ex.equipment}</Badge></li>
          </ul>
        </div>

        {steps.length > 0 && (
          <section aria-labelledby="ex-how" className={styles.section}>
            <Text variant="h5" tag="h2" id="ex-how">Как выполнять</Text>
            <ol className={styles.steps}>
              {steps.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </section>
        )}

        {coach.length > 0 && (
          <section aria-labelledby="ex-coach" className={styles.section}>
            <Text variant="h5" tag="h2" id="ex-coach">Комментарии тренера</Text>
            {coach.map((c) => (
              <CommentBubble key={c.id} author="Тренер" date={c.date} text={c.text} />
            ))}
          </section>
        )}

        {!hasHistory && (
          <EmptyState
            title="Ещё не выполнялось"
            description="Добавьте упражнение в тренировку. После первого подхода здесь появятся рекорд, подходы и график."
          />
        )}

        {tiles.length > 0 && (
          <div className={styles.tiles}>
            {tiles.map((t) => (
              <StatTile key={t.label} value={t.value} label={t.label} className={t.wide ? styles.wide : undefined} />
            ))}
          </div>
        )}

        {hasHistory && last && (
          <section aria-labelledby="ex-last" className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <Text variant="h5" tag="h2" id="ex-last">Последняя тренировка</Text>
                <Text variant="caption">{last.date}</Text>
              </div>
              <Button variant="ghost" compact onClick={onOpenHistory}>Все тренировки</Button>
            </div>
            <ol className={styles.sets}>
              {rows.map((r) => (
                <li key={r.n} className={styles.set}>
                  <span className={styles.num}>{r.n}</span>
                  <span className={styles.main}>{r.text}</span>
                  {r.bar !== undefined ? (
                    <span className={styles.track} aria-hidden="true">
                      <span className={styles.fill} style={{ width: `${r.bar}%` }} />
                    </span>
                  ) : (
                    <span className={styles.track} />
                  )}
                  {r.isRecord && <Badge tone="highlight">рекорд</Badge>}
                </li>
              ))}
            </ol>
            {note && <Text variant="caption">{note}</Text>}
          </section>
        )}

        <section aria-labelledby="ex-media" className={styles.section}>
          <Text variant="h5" tag="h2" id="ex-media">Видео и комментарии</Text>
          {media.video && (
            <MediaLink
              href="#video"
              duration={media.video.duration}
              eyebrow={`Последнее видео · ${media.video.date}`}
              title={media.video.title}
            />
          )}
          {media.comment && <CommentBubble author={media.comment.author} date={media.comment.date} text={media.comment.text} />}
          {!hasMedia && (
            <Text variant="body-sm" color="slate">
              Пока нет видео и комментариев. Запишите подход на видео во время тренировки.
            </Text>
          )}
          {hasMedia && (
            <Button variant="secondary" compact fullWidth onClick={onOpenHistory}>
              {`Смотреть все · ${mediaCountText(media.videoCount, media.commentCount)}`}
            </Button>
          )}
        </section>

        {hasHistory && (
          <section aria-label="График" className={styles.section}>
            <div className={styles.sectionHead}>
              <Text variant="h5" tag="h3">{trend.title}</Text>
              <Text variant="caption">{trend.caption}</Text>
            </div>
            <BarChart values={ex.trend} label={trend.aria} firstLabel={trend.first} lastLabel={trend.last} />
          </section>
        )}
        </div>
      </div>
    </div>
  );
}
