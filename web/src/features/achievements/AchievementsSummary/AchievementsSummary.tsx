import type { Gender } from '../../../../../shared/types';
import type { AchievementCategory } from '../../../data/types';
import { successUrl } from '../../workout/chibi/idle';
import { ChibiClip } from '../../workout/parts/ChibiClip/ChibiClip';
import { ProgressBar, Text, TierLegend } from '../../../ui';
import { closestGoal, totalCount } from '../achievements';
import styles from './AchievementsSummary.module.css';

type Props = {
  categories: AchievementCategory[];
  layout?: 'mobile' | 'desktop';
  gender?: Gender;
};

/** Сводка: сколько уровней получено, что ближе всего, легенда уровней. */
export function AchievementsSummary({ categories, layout = 'mobile', gender }: Props) {
  const { got, total } = totalCount(categories);
  const closest = closestGoal(categories);
  const desktop = layout === 'desktop';

  return (
    <section aria-label="Сводка" className={styles.root} data-layout={layout}>
      <div className={styles.top}>
        <ChibiClip src={successUrl(gender)} pose="stand" medal size={desktop ? 130 : 80} />
        <div className={styles.total}>
          <span className={styles.number}>{got} из {total}</span>
          <Text variant="body-sm" color="slate">уровней получено</Text>
        </div>
        {closest && (
          <div className={styles.closest}>
            <div className={styles.closestRow}>
              <Text variant="body-sm" tag="span">
                <span className={styles.muted}>Ближе всего:</span>{' '}
                <span className={styles.strong}>{closest.achievement.name} · {closest.goal.tierWord}</span>
              </Text>
              <Text variant="body-sm" color="slate" className={styles.progress}>{closest.goal.progressText}</Text>
            </div>
            <ProgressBar label={closest.goal.barLabel} value={closest.goal.pct} valueText={closest.goal.progressText} />
          </div>
        )}
      </div>
      <TierLegend title={desktop ? 'Уровни достижений' : undefined} className={styles.legend} />
    </section>
  );
}
