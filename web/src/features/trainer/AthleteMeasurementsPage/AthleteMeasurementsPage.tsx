import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { MeasurementKind } from '../../../../../shared/types';
import { useAthleteMeasurements, useAthletes } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { MeasureStatsView } from '../../measurements/MeasureStatsView/MeasureStatsView';
import type { Period } from '../../measurements/measurements';
import { toIso } from '../../plan/plan';
import { AthleteHeader, athleteTabPath } from '../AthleteHeader/AthleteHeader';
import styles from './AthleteMeasurementsPage.module.css';

/** /trainer/athletes/:id/measurements — замеры ученика, только чтение. */
export function AthleteMeasurementsPage() {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) return <Navigate to="/trainer" replace />;
  return <Content athleteId={Number(id)} />;
}

function Content({ athleteId }: { athleteId: number }) {
  const navigate = useNavigate();
  const list = useAthletes('all', '');
  const measurements = useAthleteMeasurements(athleteId);
  const [kind, setKind] = useState<MeasurementKind>('weight');
  const [period, setPeriod] = useState<Period>('all');
  const [point, setPoint] = useState<number | null>(null);
  const athlete = list.data?.athletes.find((a) => a.id === athleteId);

  const error = list.error ?? measurements.error;
  if (error) return <p role="alert">{error}</p>;
  if (!list.data || !measurements.data) return <Skeleton height={480} />;
  if (!athlete) return <p role="alert">Ученик не найден</p>;

  return (
    <div className={styles.root}>
      <AthleteHeader
        today={toIso(new Date())}
        athlete={athlete}
        tab="measurements"
        backHref="/trainer"
        onBack={() => navigate('/trainer')}
        onTab={(tab) => navigate(athleteTabPath(athleteId, tab))}
      />
      <MeasureStatsView
        today={toIso(new Date())}
        entries={measurements.data.entries}
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
      />
    </div>
  );
}
