import { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '../../../data/hooks';
import type { PlanData } from '../../../data/types';
import { Skeleton, useMediaQuery } from '../../../shared';
import { Notice } from '../../../ui';
import { deleteDay, putDay } from '../api';
import { PlanView } from '../PlanView/PlanView';
import { initialPlanState, planReducer } from '../plan';

export function PlanPage() {
  const { data, error } = usePlan();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return <PlanScreen initial={data} />;
}

type Entry = PlanData['entries'][string];

/** Правки плана сразу видны на экране и уходят на сервер; не получилось — день возвращается как был. */
function PlanScreen({ initial }: { initial: PlanData }) {
  const [data, setData] = useState(initial);
  const [failure, setFailure] = useState<string | null>(null);
  const [state, dispatch] = useReducer(planReducer, initial.today, (t) => initialPlanState(t));
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 1024px)');

  const show = (date: string, entry: Entry | null) =>
    setData((d) => {
      const entries = { ...d.entries };
      if (entry) entries[date] = entry;
      else delete entries[date];
      return { ...d, entries };
    });

  /** Меняет день на экране и на сервере; при ошибке возвращает прежнее и говорит об этом */
  const change = async (date: string, next: Entry | null, save: () => Promise<unknown>) => {
    const before = data.entries[date] ?? null;
    setFailure(null);
    show(date, next);
    try {
      await save();
    } catch (e) {
      show(date, before);
      setFailure(e instanceof Error ? e.message : 'Не получилось сохранить');
    }
  };

  /** «Начать» и «Изменить» открывают конкретную тренировку этого дня: шаблон берём из записи плана */
  const start = (date: string) => {
    const id = data.entries[date]?.templateId;
    navigate(id ? `/workout/${id}?date=${date}` : '/plan');
  };

  return (
    <>
      {failure && <Notice tone="error">{failure}</Notice>}
      <PlanView
        data={data}
        state={state}
        dispatch={dispatch}
        layout={desktop ? 'desktop' : 'mobile'}
        onStart={start}
        onResults={() => navigate('/workout/summary')}
        onMove={() => navigate('/')}
        onEdit={start}
        onCreate={() => navigate('/import')}
        onImport={() => navigate('/import')}
        onAdd={(date, templateId) => change(date, { templateId, status: 'planned', custom: true }, () => putDay(date, templateId))}
        onRemove={(date) => change(date, null, () => deleteDay(date))}
        onCopy={(from, to) => {
          const src = data.entries[from];
          if (src) void change(to, { templateId: src.templateId, status: 'planned', custom: true }, () => putDay(to, src.templateId));
        }}
      />
    </>
  );
}
