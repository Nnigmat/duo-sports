import { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '../../../data/hooks';
import type { PlanData } from '../../../data/types';
import { Skeleton, useMediaQuery } from '../../../shared';
import { PlanView } from '../PlanView/PlanView';
import { initialPlanState, planReducer } from '../plan';

export function PlanPage() {
  const { data, error } = usePlan();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return <PlanScreen initial={data} />;
}

/** Правки плана живут в памяти и пропадают при перезагрузке (сервера нет). */
function PlanScreen({ initial }: { initial: PlanData }) {
  const [data, setData] = useState(initial);
  const [state, dispatch] = useReducer(planReducer, initial.today, (t) => initialPlanState(t));
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 1024px)');

  const put = (date: string, entry: PlanData['entries'][string] | null) =>
    setData((d) => {
      const entries = { ...d.entries };
      if (entry) entries[date] = entry;
      else delete entries[date];
      return { ...d, entries };
    });
  const toWorkout = () => navigate('/workout');

  return (
    <PlanView
      data={data}
      state={state}
      dispatch={dispatch}
      layout={desktop ? 'desktop' : 'mobile'}
      onStart={toWorkout}
      onResults={() => navigate('/workout/summary')}
      onMove={() => navigate('/')}
      onEdit={toWorkout}
      onCreate={toWorkout}
      onImport={toWorkout}
      onAdd={(date, templateId) => put(date, { templateId, status: 'planned', custom: true })}
      onRemove={(date) => put(date, null)}
      onCopy={(from, to) => {
        const src = data.entries[from];
        if (src) put(to, { templateId: src.templateId, status: 'planned', custom: true });
      }}
    />
  );
}
