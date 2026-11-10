import { useState } from 'react';
import type { TrainerPlanItem, Workout } from '../../../../../shared/types';
import { Button, IconButton, SetChip, StatusBadge, Text, TextArea } from '../../../ui';
import { ExerciseLink } from '../ExerciseLink/ExerciseLink';
import { findSlug, movedText, planSections, plannedBadge, plannedMeta, rowDate } from '../sessions';
import styles from './PlannedDetail.module.css';

type LibraryName = { id: string; name: string; aliases: string[] };

type Props = {
  today: string;
  item: TrainerPlanItem;
  /** null — состава нет (тренировка импортирована без блоков) */
  workout: Workout | null;
  /** Библиотека упражнений: по ней находим slug, без которого подсказку не принимает сервер */
  library: LibraryName[];
  /** Промис отклонён — ошибка показывается под полем */
  onHint: (workoutId: number, exerciseId: string, text: string) => Promise<void>;
  /** Адрес карточки упражнения по названию; нет адреса — название остаётся текстом */
  exerciseHref?: (name: string) => string | undefined;
  onOpenExercise?: (href: string) => void;
  /** Открыть редактор состава тренировки */
  onEdit?: (workoutId: number) => void;
};

/** Справа в карточке ученика: состав запланированной тренировки и «Подсказка перед тренировкой» к упражнениям. */
export function PlannedDetail({ today, item, workout, library, exerciseHref, onOpenExercise, onHint, onEdit }: Props) {
  const moved = movedText(item);
  const sections = workout ? planSections(workout.blocks) : [];
  let n = 0;
  return (
    <section className={styles.root} aria-labelledby="detail-title">
      <header className={styles.head}>
        <div className={styles.headText}>
          <Text variant="eyebrow">{rowDate(item.date, today)}</Text>
          <div className={styles.titleRow}>
            <Text variant="h3" tag="h2" id="detail-title">
              {item.title}
            </Text>
            {onEdit && <IconButton bare icon="pencil" aria-label="Изменить состав тренировки" onClick={() => onEdit(item.workoutId)} />}
          </div>
        </div>
        <div className={styles.headMeta}>
          <StatusBadge status={plannedBadge(item, today)} />
          <span className={styles.meta}>{plannedMeta(item)}</span>
        </div>
      </header>
      {moved && <p className={styles.moved}>{moved}</p>}
      <p className={styles.lead}>Тренировка ещё не выполнена. Можно заранее оставить подсказки к упражнениям.</p>

      {sections.length === 0 ? (
        <p className={styles.lead}>Состав тренировки недоступен.</p>
      ) : (
        sections.map((sec) => {
          const list = (
            <ol key={sec.key} className={styles.steps} aria-label={sec.title}>
              {sec.steps.map((s) => {
                const num = sec.folded ? null : ++n;
                return (
                  <li key={s.key} className={styles.step}>
                    {num !== null && (
                      <span className={styles.num} aria-hidden="true">
                        {num}
                      </span>
                    )}
                    <div className={styles.stepBody}>
                      <ExerciseLink name={s.name} href={exerciseHref?.(s.name)} onOpen={onOpenExercise} />
                      <ul className={styles.sets} aria-label="Подходы">
                        {s.sets.map((label, i) => (
                          <li key={i}>
                            <SetChip n={i + 1} label={label} completed />
                          </li>
                        ))}
                      </ul>
                      <Hint name={s.name} slug={findSlug(s.name, library)} onSave={(slug, text) => onHint(item.workoutId, slug, text)} />
                    </div>
                  </li>
                );
              })}
            </ol>
          );
          return sec.folded ? (
            <details key={sec.key} className={styles.fold}>
              <summary className={styles.foldSummary}>
                {sec.title} · {sec.steps.length}
              </summary>
              {list}
            </details>
          ) : (
            <div key={sec.key}>{list}</div>
          );
        })
      )}
    </section>
  );
}

/** Поле подсказки; у упражнения без slug в библиотеке его нет совсем */
function Hint({ name, slug, onSave }: { name: string; slug: string | null; onSave: (slug: string, text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  if (!slug) return null;
  const save = async () => {
    setSending(true);
    setError(undefined);
    setSaved(false);
    try {
      await onSave(slug, text.trim());
      setText('');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSending(false);
    }
  };
  return (
    <form
      className={styles.hint}
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !sending) void save();
      }}
    >
      <TextArea
        label={`Подсказка перед тренировкой: ${name}`}
        placeholder="На что обратить внимание в этот раз"
        rows={2}
        value={text}
        error={error}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
      />
      <div className={styles.hintFoot}>
        <Button type="submit" variant="secondary" compact loading={sending} disabled={!text.trim()}>
          Сохранить подсказку
        </Button>
        {saved && (
          <span role="status" className={styles.saved}>
            Подсказка сохранена
          </span>
        )}
      </div>
    </form>
  );
}
