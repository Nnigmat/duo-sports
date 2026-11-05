import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toPlanData } from '../../../data/api';
import { useAthletePlan, useAthletes, useSchedule } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { PlanScreen } from '../../plan';
import { addDays, toIso } from '../../plan/plan';
import { PauseSheet, RescheduleSheet } from '../../schedule';
import { moveWorkout, pausePlan, skipWorkout } from '../../schedule/api';
import { athleteBase, copyAthleteDay, deleteAthleteDay, fetchAthletePlan, putAthleteDay } from '../api';
import { AthleteHeader } from '../AthleteHeader/AthleteHeader';
import styles from './AthletePlanPage.module.css';

/**
 * /trainer/athletes/:id/plan — план ученика: тот же календарь и те же действия, что у спортсмена.
 * Всё меняет данные ученика. «Просмотр» открывает его тренировку в превью без сохранения.
 */
export function AthletePlanPage() {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) return <Navigate to="/trainer" replace />;
  return <Content athleteId={Number(id)} />;
}

function Content({ athleteId }: { athleteId: number }) {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const list = useAthletes('all', '');
  const plan = useAthletePlan(athleteId, version);
  const athlete = list.data?.athletes.find((a) => a.id === athleteId);
  const base = `/trainer/athletes/${athleteId}`;

  const error = list.error ?? plan.error;
  if (error) return <p role="alert">{error}</p>;
  if (!list.data || !plan.data) return <Skeleton height={480} />;
  if (!athlete) return <p role="alert">Ученик не найден</p>;

  const templateOf = (date: string) => plan.data!.entries[date]?.templateId;

  return (
    <div className={styles.root}>
      <AthleteHeader
        today={toIso(new Date())}
        athlete={athlete}
        tab="plan"
        backHref="/trainer"
        onBack={() => navigate('/trainer')}
        onTab={(tab) => navigate(tab === 'plan' ? `${base}/plan` : base)}
      />
      <PlanScreen
        initial={plan.data}
        save={{ put: (date, templateId) => putAthleteDay(athleteId, date, templateId), remove: (date) => deleteAthleteDay(athleteId, date) }}
        nav={{
          onPreview: (date) => {
            const wid = templateOf(date);
            if (wid) navigate(`${base}/preview/${wid}?date=${date}`);
          },
          // «Изменить» открывает редактор состава; «Итоги» — карточку ученика с разбором
          onEdit: (date) => {
            const wid = templateOf(date);
            if (wid) navigate(`${base}/workouts/${wid}/edit`);
          },
          onResults: (date) => navigate(`${base}?date=${date}`),
          onMove: setMoveFrom,
          onCreate: (date) => navigate(`${base}/import?date=${date}`),
          onImport: () => navigate(`${base}/import`),
          copyAthletes: list.data.athletes.filter((a) => a.id !== athleteId).map((a) => ({ id: a.id, name: a.name })),
          loadAthletePlan: async (id) => toPlanData(await fetchAthletePlan(id)),
          onCopyToAthlete: (toId, templateId, date) => copyAthleteDay(athleteId, templateId, toId, date),
        }}
      />
      {moveFrom && (
        <MoveSection
          athleteId={athleteId}
          from={moveFrom}
          onClose={() => setMoveFrom(null)}
          onMoved={() => {
            setMoveFrom(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

/** Монтируется только при открытой панели: расписание запрашиваем для выбранного дня */
function MoveSection({ athleteId, from, onClose, onMoved }: { athleteId: number; from: string; onClose: () => void; onMoved: () => void }) {
  const api = athleteBase(athleteId);
  const { data: schedule, error } = useSchedule(from, api);
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
          onConfirm={(to) => void moveWorkout(toIso(new Date()), from, to, api).then(onMoved, fail('Не удалось перенести'))}
          onSkip={() => void skipWorkout(from, api).then(onMoved, fail('Не удалось пропустить'))}
          onPause={() => setPausing(true)}
        />
      )}
      <PauseSheet
        open={pausing}
        onOpenChange={(open) => !open && onClose()}
        onBack={() => setPausing(false)}
        onPick={(days) => {
          const today = toIso(new Date());
          pausePlan(today, addDays(today, days - 1), api).then(onMoved, (e: unknown) => {
            setPausing(false);
            fail('Не удалось поставить на паузу')(e);
          });
        }}
      />
    </>
  );
}
