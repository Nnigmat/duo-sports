import { useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExercises, usePlan, useSchedule } from '../../../data/hooks';
import type { PlanData } from '../../../data/types';
import { Skeleton, useMediaQuery } from '../../../shared';
import { Notice } from '../../../ui';
import { PauseSheet, RescheduleSheet } from '../../schedule';
import { moveWorkout, pausePlan, skipWorkout } from '../../schedule/api';
import { deleteDay, putDay } from '../api';
import { PlanView } from '../PlanView/PlanView';
import { addDays, initialPlanState, planReducer, toIso } from '../plan';

/** После переноса страница монтируется заново по новому key: план читается с сервера ещё раз */
export function PlanPage() {
  const [version, setVersion] = useState(0);
  return <PlanContent key={version} onMoved={() => setVersion((v) => v + 1)} />;
}

function PlanContent({ onMoved }: { onMoved: () => void }) {
  const { data, error } = usePlan();
  /** День, тренировку которого переносим; null — панель закрыта */
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <>
      <PlanScreen initial={data} save={{ put: putDay, remove: deleteDay }} onMove={setMoveFrom} />
      {moveFrom && <MoveSection from={moveFrom} onClose={() => setMoveFrom(null)} onMoved={onMoved} />}
    </>
  );
}

/** Монтируется только при открытой панели: расписание запрашиваем для выбранного дня */
function MoveSection({ from, onClose, onMoved }: { from: string; onClose: () => void; onMoved: () => void }) {
  const { data: schedule, error } = useSchedule(from);
  const [failure, setFailure] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);
  const message = failure ?? error;
  const fail = (text: string) => (e: unknown) => setFailure(e instanceof Error ? e.message : text);
  return (
    <>
      {message && <p role="alert">{message}</p>}
      {schedule && (
        <RescheduleSheet
          open={!pausing}
          onOpenChange={(open) => !open && onClose()}
          data={schedule}
          onConfirm={(to) => void moveWorkout(toIso(new Date()), from, to).then(onMoved, fail('Не удалось перенести'))}
          onSkip={() => void skipWorkout(from).then(onMoved, fail('Не удалось пропустить'))}
          onPause={() => setPausing(true)}
        />
      )}
      <PauseSheet
        open={pausing}
        onOpenChange={(open) => !open && onClose()}
        onBack={() => setPausing(false)}
        onPick={(days) => {
          const today = toIso(new Date());
          pausePlan(today, addDays(today, days - 1)).then(onMoved, (e: unknown) => {
            setPausing(false);
            fail('Не удалось поставить на паузу')(e);
          });
        }}
      />
    </>
  );
}

type Entry = PlanData['entries'][string];

/** Как правки уходят на сервер: у спортсмена в свой план, у тренера в план ученика */
export type PlanSave = { put: (date: string, templateId: string) => Promise<unknown>; remove: (date: string) => Promise<unknown> };

/** Переходы кнопок дня; у тренера свои: они ведут в данные ученика */
export type PlanNav = {
  onStart?: (date: string) => void;
  onPreview?: (date: string) => void;
  onResults?: (date: string) => void;
  onMove?: (date: string) => void;
  onEdit?: (date: string) => void;
  onCreate?: (date: string) => void;
  onImport?: () => void;
};

/**
 * Правки плана сразу видны на экране и уходят на сервер; не получилось — день возвращается как был.
 * nav: переходы кнопок; без него — как у спортсмена. onMove заменяет переход «Перенести» (панель переноса открывает страница). Новые данные сверху (initial) заменяют показанные.
 */
export function PlanScreen({ initial, save, nav, onMove }: { initial: PlanData; save: PlanSave; nav?: PlanNav; onMove?: (date: string) => void }) {
  const [data, setData] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setData(initial);
  }
  const [failure, setFailure] = useState<string | null>(null);
  const [state, dispatch] = useReducer(planReducer, initial.today, (t) => initialPlanState(t));
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 1024px)');
  // Библиотека нужна только для ссылок: пока не пришла (или упала), названия остаются текстом
  const { data: library } = useExercises();
  const exerciseIds = useMemo(() => new Map((library ?? []).map((e) => [e.name, e.id])), [library]);
  const exerciseHref = (name: string) => {
    const id = exerciseIds.get(name);
    return id ? `/exercises/${id}` : undefined;
  };

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
        exerciseHref={exerciseHref}
        onOpenExercise={navigate}
        onStart={nav ? nav.onStart : start}
        onPreview={nav?.onPreview}
        onResults={nav ? nav.onResults : () => navigate('/workout/summary')}
        onMove={onMove ?? (nav ? nav.onMove : () => navigate('/'))}
        onEdit={nav ? nav.onEdit : start}
        onCreate={nav ? nav.onCreate : (date) => navigate(`/import?date=${date}`)}
        onImport={nav ? nav.onImport : () => navigate('/import')}
        onAdd={(date, templateId) => change(date, { templateId, status: 'planned', custom: true }, () => save.put(date, templateId))}
        onRemove={(date) => change(date, null, () => save.remove(date))}
        onCopy={(from, to) => {
          const src = data.entries[from];
          if (src) void change(to, { templateId: src.templateId, status: 'planned', custom: true }, () => save.put(to, src.templateId));
        }}
      />
    </>
  );
}
