import { useId } from 'react';
import type { TodayInsights } from '../../../data/types';
import { SectionHeader } from '../../../shared';
import { AchievementMedal, Button, Icon } from '../../../ui';
import { roman } from '../../../ui/labels';
import styles from './AchievementsPreview.module.css';

type Props = {
  data: TodayInsights['achievements'];
  onOpenAll: () => void;
  onOpenLatest: () => void;
};

export function AchievementsPreview({ data, onOpenAll, onOpenLatest }: Props) {
  const titleId = useId();
  const { latest, near } = data;
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <SectionHeader
        id={titleId}
        title="Достижения"
        action={
          <Button variant="ghost" compact onClick={onOpenAll}>
            Все достижения
          </Button>
        }
      />
      <p className={styles.count}>
        {data.earnedTiers} из {data.totalTiers} уровней
      </p>
      <div className={styles.body}>
        <button type="button" className={styles.latest} onClick={onOpenLatest}>
          <AchievementMedal icon={latest.icon} tier={latest.tier} streak={latest.streak} label={latest.name} size={72} />
          <span className={styles.latestText}>
            <span className={styles.eyebrow}>Последнее · {latest.dateLabel}</span>
            <span className={styles.name}>
              {latest.name} · уровень {roman(latest.tier)}
            </span>
            <span className={styles.desc}>{latest.description}</span>
          </span>
        </button>
        <div className={styles.near}>
          <h3 className={styles.eyebrow}>Ближе всего</h3>
          <ul className={styles.list}>
            {near.map((n) => (
              <li key={n.name} className={styles.row}>
                <span className={styles.ghost}>
                  <Icon name={n.icon} size={20} />
                </span>
                <span className={styles.rowBody}>
                  <span className={styles.rowHead}>
                    <span className={styles.rowName}>{n.name}</span>
                    <span className={styles.rowProgress}>{n.progressLabel}</span>
                  </span>
                  <span
                    role="progressbar"
                    aria-label={n.name}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={n.pct}
                    className={styles.track}
                  >
                    <span className={styles.bar} style={{ width: `${n.pct}%` }} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
