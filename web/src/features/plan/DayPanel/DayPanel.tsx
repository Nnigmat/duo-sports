import { useId, useState } from 'react';
import type { PlanData } from '../../../data/types';
import { Badge, Button, Notice, Text } from '../../../ui';
import { CopyPanel, type CopyAthlete } from '../CopyPanel/CopyPanel';
import { ExerciseList } from '../ExerciseList/ExerciseList';
import { QuickAdd } from '../QuickAdd/QuickAdd';
import {
  checkCopy,
  copyTargetLookup,
  dayActions,
  displayStatus,
  emptyDayTexts,
  longDate,
  planStatusWord,
  quickDates,
  templateMeta,
} from '../plan';
import styles from './DayPanel.module.css';

type Props = {
  data: PlanData;
  /** Выбранный день, «2026-10-31» */
  date: string;
  copyOpen: boolean;
  copyDate: string | null;
  /** Плашка после копирования */
  notice: { to: string; title: string; athlete?: string } | null;
  layout?: 'mobile' | 'desktop';
  onStart?: (date: string) => void;
  /** Просмотр тренировки в режиме превью: только у тренера, на любой день с тренировкой */
  onPreview?: (date: string) => void;
  onResults?: (date: string) => void;
  onMove?: (date: string) => void;
  onEdit?: (date: string) => void;
  onRemove: (date: string) => void;
  onCreate?: (date: string) => void;
  onAdd: (date: string, templateId: string) => void;
  onToggleCopy: () => void;
  onCopyDate: (date: string) => void;
  /** Другие ученики, которым можно отправить копию (только у тренера) */
  copyAthletes?: CopyAthlete[];
  /** Выбран получатель копии (null — этот же ученик): страница подгружает его план */
  onCopyTarget?: (athleteId: number | null) => void;
  /** План выбранного получателя; пока null, замену его дня не показываем */
  targetPlan?: PlanData | null;
  /** Подтверждённая копия: куда и кому (athlete не задан — в этот же план) */
  onCopy: (to: string, athlete?: CopyAthlete) => void;
  onOpenCopied: () => void;
  /** Ссылка с названия упражнения на его карточку */
  exerciseHref?: (name: string) => string | undefined;
  onOpenExercise?: (href: string) => void;
};

/** Карточка выбранного дня: состав тренировки и действия, копирование или создание новой. */
export function DayPanel({
  data,
  date,
  copyOpen,
  copyDate,
  notice,
  layout = 'desktop',
  onStart,
  onPreview,
  onResults,
  onMove,
  onEdit,
  onRemove,
  onCreate,
  onAdd,
  onToggleCopy,
  onCopyDate,
  copyAthletes,
  onCopyTarget,
  targetPlan,
  onCopy,
  onOpenCopied,
  exerciseHref,
  onOpenExercise,
}: Props) {
  const titleId = useId();
  const copyId = useId();
  const [copyTo, setCopyTo] = useState<number | null>(null);
  const { today, max, templates, entries } = data;
  const entry = entries[date];
  const template = entry && templates.find((t) => t.id === entry.templateId);
  const dateLine = `${date === today ? 'Сегодня · ' : ''}${longDate(date)}`;

  if (!entry || !template) {
    const texts = emptyDayTexts(date, today);
    return (
      <aside aria-labelledby={titleId} className={styles.root} data-layout={layout}>
        <header className={styles.head}>
          <Text variant="eyebrow">{dateLine}</Text>
          <Text variant="h3" tag="h2" id={titleId} className={styles.title}>
            {texts.title}
          </Text>
        </header>
        {onCreate && (
          <Button icon="plus" fullWidth onClick={() => onCreate(date)}>
            {texts.create}
          </Button>
        )}
        <QuickAdd templates={templates} onAdd={(id) => onAdd(date, id)} />
      </aside>
    );
  }

  const status = displayStatus(date, entry, today);
  const actions = dayActions(status, !!entry.custom);
  const statusText =
    status === 'moved' && entry.movedTo
      ? `Перенесена на ${entry.movedTo}`
      : entry.movedFrom
        ? `${planStatusWord(status)} · перенесена со ${entry.movedFrom}`
        : planStatusWord(status);
  const target = copyAthletes?.find((a) => a.id === copyTo);
  const lookup = copyTargetLookup(data, !!target, targetPlan);
  const check = checkCopy(date, copyDate, today, max, lookup.entryAt, lookup.titleOf);

  return (
    <aside aria-labelledby={titleId} className={styles.root} data-layout={layout}>
      <header className={styles.head}>
        <Text variant="eyebrow">{dateLine}</Text>
        <Text variant="h3" tag="h2" id={titleId} className={styles.title}>
          {template.title}
        </Text>
        <Badge tone={status === 'done' ? 'accent' : status === 'today' ? 'primary' : 'neutral'} className={styles.badge}>
          {statusText}
        </Badge>
        <Text variant="body-sm" color="slate" tag="p" className={styles.meta}>
          {templateMeta(template)}
        </Text>
        {entry.more && entry.more.length > 0 && (
          <Text variant="caption" color="slate" tag="p" className={styles.meta}>
            Ещё в этот день: {entry.more.join(', ')}
          </Text>
        )}
      </header>

      <ExerciseList
        exercises={template.exercises}
        label={`Упражнения: ${template.title}`}
        hrefFor={exerciseHref}
        onOpen={onOpenExercise}
      />

      <div className={styles.actions}>
        {actions.start && onStart && (
          <Button compact icon="play" onClick={() => onStart(date)}>
            Начать
          </Button>
        )}
        {onPreview && (
          <Button compact variant="secondary" icon="play" onClick={() => onPreview(date)} aria-label="Просмотр тренировки в режиме превью">
            Просмотр
          </Button>
        )}
        {actions.results && onResults && (
          <Button compact variant="secondary" onClick={() => onResults(date)}>
            Посмотреть итоги
          </Button>
        )}
        {actions.move && onMove && (
          <Button compact variant="secondary" onClick={() => onMove(date)}>
            Перенести
          </Button>
        )}
        {actions.edit && onEdit && (
          <Button compact variant="secondary" onClick={() => onEdit(date)}>
            Изменить
          </Button>
        )}
        <Button compact variant="secondary" icon="copy" aria-expanded={copyOpen} aria-controls={copyId} onClick={onToggleCopy}>
          Копировать
        </Button>
        {actions.remove && (
          <Button compact variant="secondary" onClick={() => onRemove(date)}>
            Убрать
          </Button>
        )}
      </div>

      {copyOpen && (
        <CopyPanel
          id={copyId}
          date={copyDate}
          min={today}
          max={max}
          quick={quickDates(date, today, max, (d) => !!entries[d])}
          check={check}
          athletes={copyAthletes}
          athleteId={target ? target.id : null}
          onAthleteChange={(id) => {
            setCopyTo(id);
            onCopyTarget?.(id);
          }}
          onDateChange={onCopyDate}
          onConfirm={() => copyDate && onCopy(copyDate, target)}
          onCancel={onToggleCopy}
        />
      )}

      {notice && !copyOpen && (
        <Notice
          tone="success"
          action={
            notice.athlete ? undefined : (
              <Button compact variant="secondary" onClick={onOpenCopied}>
                Открыть день
              </Button>
            )
          }
        >
          «{notice.title}» скопирована {notice.athlete ? `ученику ${notice.athlete} ` : ''}на {longDate(notice.to).toLowerCase()}.
        </Notice>
      )}
    </aside>
  );
}
