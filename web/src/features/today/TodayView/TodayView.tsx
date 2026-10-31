import type { TodayData } from '../../../data/types';
import { AchievementsPreview } from '../AchievementsPreview/AchievementsPreview';
import { ActivityCard } from '../ActivityCard/ActivityCard';
import { RecordsList } from '../RecordsList/RecordsList';
import { TodayHeader } from '../TodayHeader/TodayHeader';
import { TodayHero, type TodayHeroActions } from '../TodayHero/TodayHero';
import { WeekCard } from '../WeekCard/WeekCard';
import { WeekStats } from '../WeekStats/WeekStats';
import styles from './TodayView.module.css';

export type TodayViewActions = TodayHeroActions & {
  onOpenAchievements: () => void;
  onOpenLatestAchievement: () => void;
  onOpenProgress: () => void;
  /** Кнопка в карточке выбранного дня недели */
  onWeekDayAction: (index: number) => void;
};

type Props = TodayViewActions & {
  data: TodayData;
};

export function TodayView({ data, onOpenAchievements, onOpenLatestAchievement, onOpenProgress, onWeekDayAction, ...hero }: Props) {
  const { insights } = data;
  return (
    <div className={styles.view}>
      <TodayHeader dateLabel={data.dateLabel} userName={data.userName} streakWeeks={data.streakWeeks} />
      <TodayHero state={data.state} {...hero} />
      <WeekCard days={data.week} onDayAction={onWeekDayAction} />
      {insights && (
        <>
          <div className={styles.insights}>
            <AchievementsPreview
              data={insights.achievements}
              onOpenAll={onOpenAchievements}
              onOpenLatest={onOpenLatestAchievement}
            />
            <div className={styles.grid}>
              <WeekStats stats={insights.weekStats} />
              <RecordsList records={insights.records} onOpenProgress={onOpenProgress} />
              <ActivityCard activity={insights.activity} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
