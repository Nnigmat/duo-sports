import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { uploadVideo } from '../api';
import { formatLongDate } from '../flow/ru';
import { WorkoutFlow } from '../WorkoutFlow/WorkoutFlow';

export function WorkoutPage() {
  const { data, error } = useWorkout();
  const navigate = useNavigate();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <WorkoutFlow
      workout={data.workout}
      comments={data.comments}
      techniques={data.techniques}
      dateLabel={formatLongDate(new Date())}
      onUploadVideo={async (blob) => {
        await uploadVideo(blob);
      }}
      onFinish={() => navigate('/')}
      onExit={() => navigate('/')}
    />
  );
}
