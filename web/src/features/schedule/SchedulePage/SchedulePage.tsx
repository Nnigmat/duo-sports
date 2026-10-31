import { useNavigate } from 'react-router-dom';
import { useSchedule } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { ScheduleView } from '../ScheduleView/ScheduleView';

export function SchedulePage() {
  const { data, error } = useSchedule();
  const navigate = useNavigate();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <ScheduleView
      data={data}
      onReschedule={() => navigate('/')}
      onSkip={() => navigate('/')}
      onPause={() => navigate('/')}
      onClose={() => navigate(-1)}
    />
  );
}
