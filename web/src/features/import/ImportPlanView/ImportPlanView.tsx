import { Button, Notice, Text } from '../../../ui';
import { ConflictsSection } from '../ConflictsSection/ConflictsSection';
import { ImportCalendar } from '../ImportCalendar/ImportCalendar';
import { ImportSteps } from '../ImportSteps/ImportSteps';
import { PlanOptionsPanel } from '../PlanOptionsPanel/PlanOptionsPanel';
import { buildPlan, calendarNote, dayLabel, firstDate, pastCount, planCta, planLead, planFooter, planSummary, resolveAll, setPast, type PlanOptions, type PlanSource } from '../importPlan';
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
  const { planOn } = options;

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

      <PlanOptionsPanel
        planOn={planOn}
        onPlanOnChange={(on) => onOptionsChange({ ...options, planOn: on })}
        past={options.past}
        onPastChange={(p) => onOptionsChange(setPast(options, p))}
        summary={planSummary(result, planOn)}
        startLabel={start ? shortDate(start) : ''}
        pastCount={pastCount(source)}
      />

      <ImportCalendar
        title={result.first && result.last ? `${dayLabel(result.first)} — ${dayLabel(result.last)}` : 'Календарь'}
        note={planOn ? calendarNote(options.past, result.first) : 'План выключен: тренировки сохранятся без дат'}
        weeks={result.weeks}
      />

      {planOn && (
        <ConflictsSection
          conflicts={result.conflicts}
          onChoice={(date, choice) => onOptionsChange({ ...options, resolutions: { ...options.resolutions, [date]: choice } })}
          onChoiceAll={(choice) => onOptionsChange({ ...options, resolutions: resolveAll(result.conflicts, choice) })}
        />
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <footer className={styles.footer}>
        <p className={styles.total}>{planFooter(total, result, planOn)}</p>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onBack} disabled={busy}>
            Назад
          </Button>
          <Button onClick={onImport} loading={busy}>
            {planCta(planOn)}
          </Button>
        </div>
      </footer>
    </div>
  );
}
