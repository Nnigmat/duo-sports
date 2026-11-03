import { Button, Notice, Text } from '../../../ui';
import { ConflictsSection } from '../ConflictsSection/ConflictsSection';
import { ImportCalendar } from '../ImportCalendar/ImportCalendar';
import { ImportSteps } from '../ImportSteps/ImportSteps';
import { PastModePanel } from '../PastModePanel/PastModePanel';
import { buildPlan, calendarNote, dayLabel, firstDate, pastCount, planLead, planFooter, resolveAll, setPast, type PlanOptions, type PlanSource } from '../importPlan';
import { shortDate } from '../../plan/plan';
import styles from './ImportPlanView.module.css';

type Props = {
  source: PlanSource;
  options: PlanOptions;
  onOptionsChange: (options: PlanOptions) => void;
  /** Сколько тренировок в файле всего (в том числе без даты) */
  total: number;
  onBack: () => void;
  onImport: () => void;
  /** Идёт сохранение: кнопка занята */
  busy?: boolean;
  /** Почему сохранить не получилось */
  error?: string | null;
};

/** Шаг 3 импорта: как тренировки лягут в календарь. Артборд «Импорт · 3 План». */
export function ImportPlanView({ source, options, onOptionsChange, total, onBack, onImport, busy, error }: Props) {
  const result = buildPlan(source, options);
  const start = firstDate(source);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Text variant="display" tag="h1">
          План из файла
        </Text>
        <Text variant="body" color="slate">
          {planLead(source)}
        </Text>
      </header>

      <ImportSteps current={3} />

      <PastModePanel
        past={options.past}
        onPastChange={(p) => onOptionsChange(setPast(options, p))}
        startLabel={start ? shortDate(start) : ''}
        pastCount={pastCount(source)}
      />

      <ImportCalendar
        title={result.first && result.last ? `${dayLabel(result.first)} — ${dayLabel(result.last)}` : 'Календарь'}
        note={calendarNote(options.past, result.first)}
        weeks={result.weeks}
      />

      <ConflictsSection
        conflicts={result.conflicts}
        onChoice={(date, choice) => onOptionsChange({ ...options, resolutions: { ...options.resolutions, [date]: choice } })}
        onChoiceAll={(choice) => onOptionsChange({ ...options, resolutions: resolveAll(result.conflicts, choice) })}
      />

      {error && <Notice tone="error">{error}</Notice>}

      <footer className={styles.footer}>
        <p className={styles.total}>{planFooter(total, result)}</p>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onBack} disabled={busy}>
            Назад
          </Button>
          <Button onClick={onImport} loading={busy}>
            Импортировать и добавить в план
          </Button>
        </div>
      </footer>
    </div>
  );
}
