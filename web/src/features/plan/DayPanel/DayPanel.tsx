import { useId } from 'react';
import type { PlanData } from '../../../data/types';
import { Badge, Button, Notice, Text } from '../../../ui';
import { CopyPanel } from '../CopyPanel/CopyPanel';
import { ExerciseList } from '../ExerciseList/ExerciseList';
import { QuickAdd } from '../QuickAdd/QuickAdd';
import {
  checkCopy,
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
  notice: { to: string; title: string } | null;
  layout?: 'mobile' | 'desktop';
  onStart: (date: string) => void;
  onResults: (date: string) => void;
  onMove: (date: string) => void;
  onEdit: (date: string) => void;
  onRemove: (date: string) => void;
  onCreate: (date: string) => void;
  onAdd: (date: string, templateId: string) => void;
  onToggleCopy: () => void;
  onCopyDate: (date: string) => void;
  /** Подтверждённая копия: куда */
  onCopy: (to: string) => void;
  onOpenCopied: () => void;
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
  onResults,
  onMove,
  onEdit,
  onRemove,
  onCreate,
  onAdd,
  onToggleCopy,
  onCopyDate,
  onCopy,
  onOpenCopied,
}: Props) {
  const titleId = useId();
  const copyId = useId();
  const { today, min, max, templates, entries } = data;
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
        <Button icon="plus" fullWidth onClick={() => onCreate(date)}>
          {texts.create}
        </Button>
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
  const check = checkCopy(
    date,
    copyDate,
    today,
    max,
    (d) => entries[d],
    (id) => templates.find((t) => t.id === id)?.title ?? id,
  );

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

      <ExerciseList exercises={template.exercises} label={`Упражнения: ${template.title}`} />

      <div className={styles.actions}>
        {actions.start && (
          <Button compact icon="play" onClick={() => onStart(date)}>
            Начать
          </Button>
        )}
        {actions.results && (
          <Button compact variant="secondary" onClick={() => onResults(date)}>
            Посмотреть итоги
          </Button>
        )}
        {actions.move && (
          <Button compact variant="secondary" onClick={() => onMove(date)}>
            Перенести
          </Button>
        )}
        {actions.edit && (
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
          onDateChange={onCopyDate}
          onConfirm={() => copyDate && onCopy(copyDate)}
          onCancel={onToggleCopy}
        />
      )}

      {notice && !copyOpen && (
        <Notice
          tone="success"
          action={
            <Button compact variant="secondary" onClick={onOpenCopied}>
              Открыть день
            </Button>
          }
        >
          «{notice.title}» скопирована на {longDate(notice.to).toLowerCase()}.
        </Notice>
      )}
    </aside>
  );
}
