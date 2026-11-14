import type { MouseEvent } from 'react';
import type { Gender } from '../../../../../shared/types';
import type { TodayData } from '../../../data/types';
import { ReviewNoticeCard } from '../../../ui';
import { AwaitingCard } from '../AwaitingCard/AwaitingCard';
import { AchievementsPreview } from '../AchievementsPreview/AchievementsPreview';
import { ActivityCard } from '../ActivityCard/ActivityCard';
import { PauseCard } from '../PauseCard/PauseCard';
import { MissedCard } from '../MissedCard/MissedCard';
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
  /** Перенос пропущенной тренировки; iso — день, на который она стояла */
  onMoveMissed?: (iso: string) => void;
  /** Возобновить план, стоящий на паузе */
  onResume?: () => void;
  /** Куда ведут карточка разбора и колокольчик; без него разбор не показываем */
  reviewHref?: string;
  onOpenReview?: () => void;
  onDismissReview?: () => void;
  /** Напоминание о замерах; карточка показывается, только если переданы оба свойства */
  measureReminder?: { daysSince: number | null };
  onMeasure?: () => void;
};

type Props = TodayViewActions & {
  data: TodayData;
  gender?: Gender;
};

export function TodayView({ data, gender, onOpenAchievements, onOpenLatestAchievement, onOpenProgress, onWeekDayAction, onMoveMissed, onResume, reviewHref, onOpenReview, onDismissReview, measureReminder, onMeasure, ...hero }: Props) {
  const { insights, reviewNotice, awaitingReview } = data;
  const openReview = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpenReview) return;
    e.preventDefault();
    onOpenReview();
  };
  return (
    <div className={styles.view}>
      <TodayHeader
        dateLabel={data.dateLabel}
        userName={data.userName}
        streakWeeks={data.streakWeeks}
        bell={reviewHref && reviewNotice ? { href: reviewHref, unread: data.unread ?? 0, onClick: openReview } : undefined}
      />
      {onResume && data.pause && <PauseCard pause={data.pause} onResume={onResume} />}
      {reviewHref && reviewNotice && onDismissReview && <ReviewNoticeCard notice={reviewNotice} href={reviewHref} onLinkClick={openReview} onDismiss={onDismissReview} />}
      {awaitingReview && <AwaitingCard awaiting={awaitingReview} />}
      <TodayHero state={data.state} gender={gender} measureReminder={measureReminder} onMeasure={onMeasure} {...hero} />
      <WeekCard days={data.week} onDayAction={onWeekDayAction} />
      {onMoveMissed && data.missed && <MissedCard items={data.missed} onMove={onMoveMissed} />}
      {insights && (
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
      )}
    </div>
  );
}
