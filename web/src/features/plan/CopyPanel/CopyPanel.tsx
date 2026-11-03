import { useId } from 'react';
import { Button, Chip, Notice, Select, Text, TextInput } from '../../../ui';
import { shortDate, type CopyCheck, type QuickDate } from '../plan';
import styles from './CopyPanel.module.css';

/** Ученик, которому можно отправить копию */
export type CopyAthlete = { id: number; name: string };

type Props = {
  /** id панели: на него указывает aria-controls кнопки «Копировать» */
  id: string;
  /** Выбранная дата копии, «2026-11-03» */
  date: string | null;
  min: string;
  max: string;
  quick: QuickDate[];
  check: CopyCheck;
  /** Другие ученики тренера; без них копия только в этот же план */
  athletes?: CopyAthlete[];
  /** Кому копия: null — тому же ученику */
  athleteId?: number | null;
  onAthleteChange?: (id: number | null) => void;
  onDateChange: (date: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Панель «Копировать на другую дату»: поле даты, быстрый выбор, предупреждение о замене. */
export function CopyPanel({ id, date, min, max, quick, check, athletes, athleteId = null, onAthleteChange, onDateChange, onConfirm, onCancel }: Props) {
  const titleId = useId();
  return (
    <div id={id} role="group" aria-labelledby={titleId} className={styles.root}>
      <div className={styles.head}>
        <Text variant="h5" tag="h3" id={titleId} className={styles.title}>
          Копировать на другую дату
        </Text>
        <Text variant="caption" color="slate" tag="p">
          Выбери дату здесь или нажми на день в календаре.
        </Text>
      </div>
      {athletes && athletes.length > 0 && onAthleteChange && (
        <Select label="Кому" value={athleteId ?? ''} onChange={(e) => onAthleteChange(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">Этому ученику</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      )}
      <TextInput type="date" label="Дата" min={min} max={max} value={date ?? ''} onChange={(e) => onDateChange(e.target.value)} />
      <div role="group" aria-label="Быстрый выбор даты" className={styles.chips}>
        {quick.map((q) => (
          <Chip key={q.key} pressed={q.date === date} count={shortDate(q.date)} onClick={() => onDateChange(q.date)}>
            {q.label}
          </Chip>
        ))}
      </div>
      {check.warning ? (
        <Notice tone="warn">{check.warning}</Notice>
      ) : (
        <Text variant="caption" color="slate" tag="p" role="status">
          {check.hint}
        </Text>
      )}
      <div className={styles.actions}>
        <Button compact disabled={!check.valid} onClick={onConfirm}>
          {check.label}
        </Button>
        <Button compact variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
