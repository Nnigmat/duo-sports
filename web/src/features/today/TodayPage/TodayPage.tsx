import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedule, useToday } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { RescheduleSheet } from '../../schedule';
import { TodayView } from '../TodayView/TodayView';

export function TodayPage() {
  const { data, error } = useToday();
  const { data: schedule } = useSchedule();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const navigate = useNavigate();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  const open = (path: string) => () => navigate(path);
  const reschedule = () => setRescheduleOpen(true);
  const onWeekDayAction = (index: number) => {
    const action = data.week[index]?.actionLabel;
    if (action === 'Перенести') reschedule();
    else if (action === 'Итоги') navigate('/workout/summary');
    else navigate('/workout');
  };

  return (
    <>
      <TodayView
        data={data}
        onStart={open('/workout')}
        onReschedule={reschedule}
        onOpenExercises={open('/exercises')}
        onStretch={open('/workout/stretch')}
        onTrainAnyway={open('/workout')}
        onOpenSummary={open('/workout/summary')}
        onOpenAchievements={open('/progress/achievements')}
        onOpenLatestAchievement={open('/progress/achievements')}
        onOpenProgress={open('/progress')}
        onWeekDayAction={onWeekDayAction}
      />
      {schedule && (
        <RescheduleSheet
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          data={schedule}
          onConfirm={() => setRescheduleOpen(false)}
          onSkip={() => setRescheduleOpen(false)}
          onPause={() => setRescheduleOpen(false)}
        />
      )}
    </>
  );
}
