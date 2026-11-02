import type { TodayState } from '../../../data/types';
import { formatMinutes, formatVolume, recordsWord } from '../../../shared/format';
import { Button } from '../../../ui';
import styles from './TodayHero.module.css';

type Props = {
  titleId: string;
  summary: Extract<TodayState, { kind: 'done' }>['summary'];
  onOpenSummary: () => void;
};

export function DoneCard({ titleId, summary, onOpenSummary }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Сегодня · сделано</p>
      <h2 id={titleId} className={styles.title}>
        {summary.title}
      </h2>
      <dl className={styles.stats}>
        {summary.minutes !== undefined && (
          <div>
            <dd>{formatMinutes(summary.minutes)}</dd>
            <dt>время</dt>
          </div>
        )}
        <div>
          <dd>{formatVolume(summary.volumeKg)}</dd>
          <dt>объём</dt>
        </div>
        {summary.records !== undefined && (
          <div>
            <dd>{summary.records}</dd>
            <dt>{recordsWord(summary.records)}</dt>
          </div>
        )}
      </dl>
      <div className={styles.actions}>
        <Button onClick={onOpenSummary}>Посмотреть итоги</Button>
      </div>
    </div>
  );
}
