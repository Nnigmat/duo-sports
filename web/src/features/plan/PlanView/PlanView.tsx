import { useId, type Dispatch } from 'react';
import type { PlanData } from '../../../data/types';
import { Button, Text } from '../../../ui';
import { CalendarGrid } from '../CalendarGrid/CalendarGrid';
import { CalendarToolbar } from '../CalendarToolbar/CalendarToolbar';
import { DayPanel } from '../DayPanel/DayPanel';
import { ToneLegend } from '../ToneLegend/ToneLegend';
import { calendarDays, canShift, rangeTitle, usedTemplates, type PlanAction, type PlanState } from '../plan';
import styles from './PlanView.module.css';

type Props = {
  data: PlanData;
  state: PlanState;
  dispatch: Dispatch<PlanAction>;
  onStart: (date: string) => void;
  onResults: (date: string) => void;
  onMove: (date: string) => void;
  onEdit: (date: string) => void;
  onRemove: (date: string) => void;
  onCreate: (date: string) => void;
  onAdd: (date: string, templateId: string) => void;
  /** Копия тренировки `from` на день `to` (заменяет тренировку, если она там есть) */
  onCopy: (from: string, to: string) => void;
  onImport?: () => void;
  layout?: 'mobile' | 'desktop';
};

/** Экран «План»: календарь месяца или недели и карточка выбранного дня. */
export function PlanView({
  data,
  state,
  dispatch,
  onStart,
  onResults,
  onMove,
  onEdit,
  onRemove,
  onCreate,
  onAdd,
  onCopy,
  onImport,
  layout = 'mobile',
}: Props) {
  const calTitleId = useId();
  const desktop = layout === 'desktop';
  const { view, anchor, sel, copyOpen, copyDate, notice } = state;
  const { today, min, max, templates, entries } = data;
  const selectedTemplate = templates.find((t) => t.id === entries[sel]?.templateId);

  return (
    <div className={styles.root} data-layout={layout}>
      <header className={styles.header}>
        <div className={styles.heading}>
          {desktop && <Text variant="eyebrow">Расписание</Text>}
          <Text variant={desktop ? 'display' : 'h1'} tag="h1" className={styles.title}>
            План
          </Text>
          {desktop && (
            <Text variant="body" color="slate" tag="p" className={styles.lead}>
              Нажми на день, чтобы посмотреть тренировку или добавить новую.
            </Text>
          )}
        </div>
        {desktop && onImport && (
          <Button variant="secondary" icon="upload" onClick={onImport}>
            Импорт из YAML
          </Button>
        )}
      </header>

      <div className={styles.body}>
        <section aria-labelledby={calTitleId} className={styles.calendar}>
          <CalendarToolbar
            titleId={calTitleId}
            title={rangeTitle(view, anchor)}
            view={view}
            canPrev={canShift(view, anchor, -1, min, max)}
            canNext={canShift(view, anchor, 1, min, max)}
            onPrev={() => dispatch({ type: 'shift', dir: -1 })}
            onNext={() => dispatch({ type: 'shift', dir: 1 })}
            onToday={() => dispatch({ type: 'today', today })}
            onViewChange={(v) => dispatch({ type: 'view', view: v })}
          />
          <CalendarGrid
            data={data}
            view={view}
            anchor={anchor}
            sel={sel}
            copyDate={copyOpen ? copyDate : null}
            layout={layout}
            onPick={(date) => dispatch({ type: 'pick', date, today })}
          />
          <ToneLegend templates={usedTemplates(templates, entries, calendarDays(view, anchor))} />
        </section>

        <div className={styles.panel}>
          <DayPanel
            data={data}
            date={sel}
            copyOpen={copyOpen}
            copyDate={copyDate}
            notice={notice}
            layout={layout}
            onStart={onStart}
            onResults={onResults}
            onMove={onMove}
            onEdit={onEdit}
            onRemove={onRemove}
            onCreate={onCreate}
            onAdd={onAdd}
            onToggleCopy={() => dispatch({ type: 'toggleCopy' })}
            onCopyDate={(date) => dispatch({ type: 'copyDate', date })}
            onCopy={(to) => {
              onCopy(sel, to);
              dispatch({ type: 'copied', to, title: selectedTemplate?.title ?? '' });
            }}
            onOpenCopied={() => dispatch({ type: 'openCopied' })}
          />
        </div>
      </div>
    </div>
  );
}
