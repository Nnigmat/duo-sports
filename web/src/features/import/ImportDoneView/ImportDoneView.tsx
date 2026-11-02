import { Button, Notice, StatTile, Text } from '../../../ui';
import { AddedExercises } from '../AddedExercises/AddedExercises';
import { ImportNotices } from '../ImportNotices/ImportNotices';
import { ImportSteps } from '../ImportSteps/ImportSteps';
import { addedList, buildNotices, doneSummary, doneTexts, undoneNote, undoText } from '../done';
import { plural } from '../../workout/flow/ru';
import type { PlanResult } from '../importPlan';
import type { ExerciseChoices, NewExercise } from '../types';
import styles from './ImportDoneView.module.css';

type Props = {
  /** Время импорта, «14:20» */
  time: string;
  plan: PlanResult;
  newExercises: NewExercise[];
  choices: ExerciseChoices;
  /** Тренировок в файле всего */
  total: number;
  /** Названия своих тренировок, которые импорт заменил и отмена вернёт */
  restored: string[];
  undone: boolean;
  onUndo: () => void;
  onRedo: () => void;
  workoutsHref: string;
  planHref: string;
  exercisesHref: string;
  /** «Импортировать ещё» / «Вставить снова» */
  againHref: string;
  /** Идёт отмена или возврат */
  busy?: boolean;
  /** Почему отменить или вернуть не получилось */
  error?: string | null;
};

/** Шаг 4 импорта: итоги, замечания и отмена в течение суток. Артборд «Импорт · 4 Готово». */
export function ImportDoneView({
  time, plan, newExercises, choices, total, restored, undone, onUndo, onRedo, workoutsHref, planHref, exercisesHref, againHref, busy, error,
}: Props) {
  const summary = doneSummary(newExercises, choices, plan, total);
  const texts = doneTexts(undone, time, plan);
  const stats = [
    { value: summary.workouts, label: plural(summary.workouts, ['тренировка', 'тренировки', 'тренировок']) },
    { value: summary.inCalendar, label: 'в календаре' },
    { value: summary.created, label: plural(summary.created, ['новое упражнение', 'новых упражнения', 'новых упражнений']) },
    { value: summary.weeks, label: plural(summary.weeks, ['неделя', 'недели', 'недель']) },
  ];

  return (
    <div className={styles.root}>
      <ImportSteps current={4} />

      <section className={styles.hero} aria-labelledby="done-title">
        <Text variant="eyebrow">{texts.eyebrow}</Text>
        <Text variant="display" tag="h1" id="done-title">
          {texts.heading}
        </Text>
        <Text variant="body" color="slate" role="status">
          {texts.lead}
        </Text>
        {!undone && (
          <ul className={styles.stats} aria-label="Итоги импорта">
            {stats.map((s) => (
              <li key={s.label}>
                <StatTile value={String(s.value)} label={s.label} />
              </li>
            ))}
          </ul>
        )}
        <div className={styles.actions}>
          <Button href={workoutsHref} variant={undone ? 'primary' : 'secondary'}>
            К тренировкам
          </Button>
          {!undone && <Button href={planHref}>Открыть план</Button>}
          <Button href={againHref} variant="ghost">
            {texts.againLabel}
          </Button>
        </div>
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {undone ? (
        <section className={styles.undone} aria-label="Что отменено">
          <Text variant="body">{undoneNote(summary, restored)}</Text>
          <Button variant="secondary" onClick={onRedo} loading={busy}>
            Вернуть импорт
          </Button>
        </section>
      ) : (
        <>
          <AddedExercises items={addedList(newExercises, choices)} created={summary.created} href={exercisesHref} />
          <ImportNotices notices={buildNotices(plan, newExercises, choices)} />
          <section className={styles.undo} aria-labelledby="undo-title">
            <div className={styles.undoTexts}>
              <Text variant="h4" tag="h2" id="undo-title">
                Передумали?
              </Text>
              <Text variant="body-sm" color="slate">
                {undoText(time)}
              </Text>
            </div>
            <Button variant="secondary" onClick={onUndo} loading={busy}>
              Отменить импорт
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
