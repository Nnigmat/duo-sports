import type { Achievement } from '../../../data/types';
import { AchievementMedal, GoalChip, Icon, ProgressBar, Text } from '../../../ui';
import { isMaxed, nextGoal, tierLine } from '../achievements';
import styles from './AchievementCard.module.css';

type Props = {
  achievement: Achievement;
  /** desktop: крупнее медаль, «До серебра» над полоской */
  layout?: 'mobile' | 'desktop';
};

/** Карточка достижения: медаль, уровень, условие и путь к следующему уровню. */
export function AchievementCard({ achievement: a, layout = 'mobile' }: Props) {
  const goal = nextGoal(a);
  const desktop = layout === 'desktop';

  return (
    <article className={styles.card} data-layout={layout}>
      <div className={styles.head}>
        <AchievementMedal icon={a.icon} tier={a.tier} streak={a.streak} size={desktop ? 56 : 48} label={a.name} />
        <div className={styles.titles}>
          <Text variant="h5" tag="h3">{a.name}</Text>
          <Text variant="caption" color="slate">{tierLine(a)}</Text>
        </div>
      </div>
      <Text variant="caption" color="slate" tag="p" className={styles.description}>{a.description}</Text>
      {goal && (
        <div className={styles.goal}>
          {desktop ? (
            <>
              <GoalChip tier={goal.tier}>{goal.chipText}</GoalChip>
              <div className={styles.row}>
                <Text variant="caption">{goal.untilText}</Text>
                <Text variant="caption" color="slate" className={styles.progress}>{goal.progressText}</Text>
              </div>
            </>
          ) : (
            <div className={styles.row}>
              <GoalChip tier={goal.tier}>{goal.chipText}</GoalChip>
              <Text variant="caption" color="slate" className={styles.progress}>{goal.progressText}</Text>
            </div>
          )}
          <ProgressBar label={goal.barLabel} value={goal.pct} valueText={goal.progressText} />
        </div>
      )}
      {isMaxed(a) && (
        <span className={styles.maxed}>
          <Icon name="check" size={20} className={styles.check} />
          <Text variant="caption" color="slate">Все уровни получены</Text>
        </span>
      )}
    </article>
  );
}
