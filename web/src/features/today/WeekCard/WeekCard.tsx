import { useId, useState } from 'react';
import type { TodayWeekDay } from '../../../data/types';
import { SectionHeader, useMediaQuery } from '../../../shared';
import { Button, ProgressSegments, WeekStrip } from '../../../ui';
import { statusWord } from '../../../ui/labels';
import { weekProgress } from '../weekProgress';
import styles from './WeekCard.module.css';

type Props = {
  days: TodayWeekDay[];
  /** Кнопка в карточке выбранного дня: «Начать», «Перенести», «Итоги» */
  onDayAction: (index: number) => void;
};

const LEGEND = [
  { status: 'done', label: 'Выполнена' },
  { status: 'planned', label: 'Запланирована' },
  { status: 'moved', label: 'Перенесена' },
  { status: 'rest', label: 'Отдых' },
] as const;

/** Прогресс недели: счётчик, сегменты, ряд дней и карточка выбранного дня. */
export function WeekCard({ days, onDayAction }: Props) {
  const titleId = useId();
  const wide = useMediaQuery('(min-width: 768px)');
  const { done, total } = weekProgress(days);
  const [selected, setSelected] = useState(() => Math.max(0, days.findIndex((d) => d.today)));
  const cur = days[Math.min(selected, days.length - 1)];

  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <SectionHeader id={titleId} title="Эта неделя" action={<span className={styles.count}>{done} из {total}</span>} />
      {total > 0 && <ProgressSegments count={total} current={done} label="Тренировки недели" />}
      <WeekStrip days={days} variant={wide ? 'wide' : 'compact'} selectedIndex={selected} onSelect={setSelected} />
      {cur && (
        <div className={styles.detail} aria-live="polite">
          <div className={styles.detailText}>
            <span className={styles.detailWhen}>
              {cur.fullLabel} · {statusWord(cur.status)}
            </span>
            <span className={styles.detailTitle}>{cur.title}</span>
            <span className={styles.detailMeta}>{cur.meta}</span>
          </div>
          {cur.actionLabel && (
            <Button variant="secondary" compact onClick={() => onDayAction(days.indexOf(cur))}>
              {cur.actionLabel}
            </Button>
          )}
        </div>
      )}
      <ul className={styles.legend} aria-label="Обозначения">
        {LEGEND.map((l) => (
          <li key={l.status}>
            <span className={`${styles.swatch} ${styles[l.status]}`} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
