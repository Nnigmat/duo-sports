import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchedule } from "../../../data/hooks";
import { addDays, toIso } from "../../plan/plan";
import { moveWorkout, pausePlan, skipWorkout } from "../api";
import { PauseSheet } from "../PauseSheet/PauseSheet";
import { Skeleton } from "../../../shared";
import { ScheduleView } from "../ScheduleView/ScheduleView";

export function SchedulePage() {
  const { data, error } = useSchedule();
  const [moveError, setMoveError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);
  const navigate = useNavigate();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <>
      {moveError && <p role="alert">{moveError}</p>}
      {!pausing && (
        <ScheduleView
          data={data}
          onReschedule={(to) => {
            const today = toIso(new Date());
            moveWorkout(today, today, to).then(
              () => navigate("/"),
              (e: unknown) =>
                setMoveError(
                  e instanceof Error ? e.message : "Не удалось перенести",
                ),
            );
          }}
          onSkip={() => {
            skipWorkout(toIso(new Date())).then(
              () => navigate("/"),
              (e: unknown) =>
                setMoveError(
                  e instanceof Error ? e.message : "Не удалось пропустить",
                ),
            );
          }}
          onPause={() => setPausing(true)}
          onClose={() => navigate(-1)}
        />
      )}
      <PauseSheet
        open={pausing}
        onOpenChange={(open) => !open && navigate(-1)}
        onBack={() => setPausing(false)}
        onPick={(days) => {
          const today = toIso(new Date());
          pausePlan(today, addDays(today, days - 1)).then(
            () => navigate("/"),
            (e: unknown) => {
              setPausing(false);
              setMoveError(
                e instanceof Error
                  ? e.message
                  : "Не удалось поставить на паузу",
              );
            },
          );
        }}
      />
    </>
  );
}
