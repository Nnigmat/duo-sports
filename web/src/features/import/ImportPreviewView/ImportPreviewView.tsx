import { Button, Notice, Text } from '../../../ui';
import { ImportSteps } from '../ImportSteps/ImportSteps';
import { NewExercisesSection } from '../NewExercisesSection/NewExercisesSection';
import { PreviewSummary } from '../PreviewSummary/PreviewSummary';
import { WeeksSection } from '../WeeksSection/WeeksSection';
import { footerText, tally } from '../preview';
import { plural } from '../../workout/flow/ru';
import type { ExerciseChoices, PreviewData } from '../types';
import styles from './ImportPreviewView.module.css';

type Props = {
  data: PreviewData;
  choices: ExerciseChoices;
  onChoicesChange: (choices: ExerciseChoices) => void;
  onBack: () => void;
  onNext: () => void;
};

/** Шаг 2 импорта: проверить, что загружаем, и решить судьбу новых упражнений. Артборд «Импорт · 2 Проверка». */
export function ImportPreviewView({ data, choices, onChoicesChange, onBack, onNext }: Props) {
  const workouts = data.weeks.reduce((n, w) => n + w.sessions.length, 0);
  const t = tally(data.newExercises, choices);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Text variant="display" tag="h1">
          Проверьте, что загружаем
        </Text>
        <Text variant="body" color="slate">
          Вставленный текст: {data.lines} {plural(data.lines, ['строка', 'строки', 'строк'])}. Пока ничего не сохранено.
        </Text>
      </header>

      <ImportSteps current={2} />
      {data.warnings && data.warnings.length > 0 && (
        <ul className={styles.warnings} aria-label="Предупреждения разбора">
          {data.warnings.map((w) => (
            <li key={w}>
              <Notice tone="warn">{w}</Notice>
            </li>
          ))}
        </ul>
      )}
      <PreviewSummary workouts={workouts} weeks={data.weeks.length} days={data.days} period={data.period} found={data.found} newCount={data.newExercises.length} />
      <NewExercisesSection exercises={data.newExercises} choices={choices} onChoicesChange={onChoicesChange} />
      <WeeksSection weeks={data.weeks} note={data.weeksNote} newExercises={data.newExercises} choices={choices} />

      <footer className={styles.footer}>
        <div className={styles.total}>
          <p>
            <b>
              {workouts} {plural(workouts, ['тренировка', 'тренировки', 'тренировок'])}
            </b>{' '}
            · {footerText(t)}
          </p>
          <Text variant="caption" color="steel">
            Упражнения появятся во вкладке «Упражнения» только после шага «Готово».
          </Text>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onBack}>
            Назад
          </Button>
          <Button onClick={onNext}>Далее: план</Button>
        </div>
      </footer>
    </div>
  );
}
