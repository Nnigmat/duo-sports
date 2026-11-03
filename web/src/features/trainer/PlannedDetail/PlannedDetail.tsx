import { useState } from 'react';
import type { TrainerPlanItem, Workout } from '../../../../../shared/types';
import { Button, IconButton, SetChip, StatusBadge, Text, TextArea } from '../../../ui';
import { findSlug, movedText, planSteps, plannedBadge, plannedMeta, rowDate } from '../sessions';
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
  /** Открыть редактор состава тренировки */
  onEdit?: (workoutId: number) => void;
};

/** Справа в карточке ученика: состав запланированной тренировки и «Подсказка перед тренировкой» к упражнениям. */
export function PlannedDetail({ today, item, workout, library, onHint, onEdit }: Props) {
  const moved = movedText(item);
  const steps = workout ? planSteps(workout.blocks) : [];
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

      {steps.length === 0 ? (
        <p className={styles.lead}>Состав тренировки недоступен.</p>
      ) : (
        <ol className={styles.steps} aria-label="Шаги тренировки">
          {steps.map((s, i) => (
            <li key={s.key} className={styles.step}>
              <span className={styles.num} aria-hidden="true">
                {i + 1}
              </span>
              <div className={styles.stepBody}>
                <h3 className={styles.name}>{s.name}</h3>
                <ul className={styles.sets} aria-label="Подходы">
                  {s.sets.map((label, n) => (
                    <li key={n}>
                      <SetChip n={n + 1} label={label} completed />
                    </li>
                  ))}
                </ul>
                <Hint name={s.name} slug={findSlug(s.name, library)} onSave={(slug, text) => onHint(item.workoutId, slug, text)} />
              </div>
            </li>
          ))}
        </ol>
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
