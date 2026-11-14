import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, toIso } from '../../plan/plan';
import { useAuth } from '../../../app/auth/AuthProvider';
import { useExercises, useSchedule, useToday } from '../../../data/hooks';
import { exerciseHrefFor } from '../../exercises/library';
import { Skeleton } from '../../../shared';
import { PauseSheet, RescheduleSheet } from '../../schedule';
import { dismissNotification } from '../../review/api';
import { moveWorkout, pausePlan, resumePlan, skipWorkout, unskipWorkout } from '../../schedule/api';
import { TodayView } from '../TodayView/TodayView';

/** После переноса страница монтируется заново по новому key: «Сегодня» и расписание читаются с сервера ещё раз */
export function TodayPage() {
  const [version, setVersion] = useState(0);
  return <TodayContent key={version} onMoved={() => setVersion((v) => v + 1)} />;
}

function TodayContent({ onMoved }: { onMoved: () => void }) {
  const { data, error } = useToday();
  const auth = useAuth();
  /** День, тренировку которого переносим; null — панель закрыта */
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Скрытая карточка исчезает сразу, не дожидаясь нового запроса «Сегодня» */
  const [dismissed, setDismissed] = useState<number | null>(null);
  const navigate = useNavigate();
  // Библиотека нужна только для ссылок: пока не пришла (или упала), названия остаются текстом
  const { data: library } = useExercises();
  const exerciseHref = useMemo(() => exerciseHrefFor(library ?? undefined), [library]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  const open = (path: string) => () => navigate(path);
  const notice = data.reviewNotice && data.reviewNotice.notificationId !== dismissed ? data.reviewNotice : undefined;
  const view = notice ? { ...data, reviewNotice: notice } : { ...data, reviewNotice: undefined, unread: 0 };
  const reschedule = () => setMoveFrom(toIso(new Date()));
  const start = () => navigate(data.state.kind === 'workout' ? `/workout/${data.state.workout.id}?date=${toIso(new Date())}` : '/workout');
  const onWeekDayAction = (index: number) => {
    const action = data.week[index]?.actionLabel;
    const day = data.week[index];
    if (action === 'Перенести' && day?.iso) setMoveFrom(day.iso);
    else if (action === 'Вернуть' && day?.iso) {
      setActionError(null);
      unskipWorkout(day.iso).then(onMoved, (e: Error) => setActionError(e.message));
    } else if (action === 'Итоги') navigate(day?.sessionId ? `/review/${day.sessionId}` : '/plan');
    else start();
  };

  return (
    <>
      <TodayView
        gender={auth.status === 'in' ? auth.user.gender : undefined}
        data={view}
        reviewHref={notice ? `/review/${notice.sessionId}` : undefined}
        onOpenReview={notice ? () => navigate(`/review/${notice.sessionId}`) : undefined}
        onDismissReview={
          notice
            ? () => {
                setActionError(null);
                setDismissed(notice.notificationId);
                dismissNotification(notice.notificationId).catch((e: Error) => {
                  setDismissed(null);
                  setActionError(e.message);
                });
              }
            : undefined
        }
        onStart={start}
        onReschedule={reschedule}
        onOpenExercises={open('/exercises')}
        exerciseHref={exerciseHref}
        onOpenExercise={navigate}
        onStretch={open('/workout/stretch')}
        onTrainAnyway={open('/workout')}
        onOpenSummary={open(data.state.kind === 'done' && data.state.summary.sessionId ? `/review/${data.state.summary.sessionId}` : '/plan')}
        onOpenAchievements={open('/progress/achievements')}
        onOpenLatestAchievement={open('/progress/achievements')}
        onOpenProgress={open('/progress')}
        onWeekDayAction={onWeekDayAction}
        onMoveMissed={setMoveFrom}
        onResume={() => {
          setActionError(null);
          resumePlan(toIso(new Date())).then(onMoved, (e: Error) => setActionError(e.message));
        }}
      />
      {actionError && <p role="alert">{actionError}</p>}
      {moveFrom && <RescheduleSection from={moveFrom} onClose={() => setMoveFrom(null)} onMoved={onMoved} />}
    </>
  );
}

/** Монтируется только при открытой панели: расписание запрашиваем для выбранного дня, а не при каждой загрузке «Сегодня» */
function RescheduleSection({ from, onClose, onMoved }: { from: string; onClose: () => void; onMoved: () => void }) {
  const { data: schedule, error } = useSchedule(from);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);
  const message = moveError ?? error;
  return (
    <>
      {message && <p role="alert">{message}</p>}
      {schedule && (
        <RescheduleSheet
          open={!pausing}
          onOpenChange={(open) => !open && onClose()}
          data={schedule}
          onConfirm={(to) => {
            moveWorkout(toIso(new Date()), from, to).then(onMoved, (e: unknown) => setMoveError(e instanceof Error ? e.message : 'Не удалось перенести'));
          }}
          onSkip={() => {
            skipWorkout(from).then(onMoved, (e: unknown) => setMoveError(e instanceof Error ? e.message : 'Не удалось пропустить'));
          }}
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
            setMoveError(e instanceof Error ? e.message : 'Не удалось поставить на паузу');
          });
        }}
      />
    </>
  );
}
