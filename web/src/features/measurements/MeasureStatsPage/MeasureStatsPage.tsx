import { useNavigate } from 'react-router-dom';
import { useMeasurements } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { toIso } from '../../plan/plan';
import { MeasureStatsView } from '../MeasureStatsView/MeasureStatsView';
import { useMeasureStatsState } from '../useMeasureStatsState';

/** /progress/measurements — вкладка «Замеры»: прогресс ученика по замерам. */
export function MeasureStatsPage() {
  const navigate = useNavigate();
  const { data, error } = useMeasurements();
  const state = useMeasureStatsState();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;
  return (
    <MeasureStatsView
      today={toIso(new Date())}
      entries={data.entries}
      {...state}
      titled
      onAdd={() => navigate('/progress/measurements/new')}
    />
  );
}
