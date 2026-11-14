import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MeasurementKind } from '../../../../../shared/types';
import { useMeasurements } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { toIso } from '../../plan/plan';
import { MeasureStatsView } from '../MeasureStatsView/MeasureStatsView';
import type { Period } from '../measurements';

/** /progress/measurements — прогресс по замерам ученика. */
export function MeasureStatsPage() {
  const navigate = useNavigate();
  const { data, error } = useMeasurements();
  const [kind, setKind] = useState<MeasurementKind>('weight');
  const [period, setPeriod] = useState<Period>('all');
  const [point, setPoint] = useState<number | null>(null);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;
  return (
    <MeasureStatsView
      today={toIso(new Date())}
      entries={data.entries}
      kind={kind}
      period={period}
      point={point}
      onKind={(k) => {
        setKind(k);
        setPoint(null);
      }}
      onPeriod={(p) => {
        setPeriod(p);
        setPoint(null);
      }}
      onPoint={setPoint}
      onBack={() => navigate('/progress/achievements')}
      onAdd={() => navigate('/progress/measurements/new')}
    />
  );
}
