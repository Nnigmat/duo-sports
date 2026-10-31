import { useId } from 'react';
import type { Pose } from '../../../../../shared/types';
import type { TodayState } from '../../../data/types';
import { cx } from '../../../ui/cx';
import { Chibi } from '../../workout/chibi/Chibi';
import { DoneCard } from './DoneCard';
import { RestCard } from './RestCard';
import { WorkoutCard } from './WorkoutCard';
import styles from './TodayHero.module.css';

export type TodayHeroActions = {
  onStart: () => void;
  onReschedule: () => void;
  onOpenExercises: () => void;
  onStretch: () => void;
  onTrainAnyway: () => void;
  onOpenSummary: () => void;
};

type Props = TodayHeroActions & {
  state: TodayState;
  className?: string;
};

const POSE: Record<TodayState['kind'], Pose> = { workout: 'wave', rest: 'rest', done: 'cheer' };

/** Чибик и карточка дня: тренировка, отдых или сделано. */
export function TodayHero({ state, className, ...actions }: Props) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cx(styles.hero, className)}>
      <div className={styles.disk}>
        <Chibi pose={POSE[state.kind]} size={200} />
      </div>
      {state.kind === 'workout' && <WorkoutCard titleId={titleId} workout={state.workout} {...actions} />}
      {state.kind === 'rest' && <RestCard titleId={titleId} next={state.next} {...actions} />}
      {state.kind === 'done' && <DoneCard titleId={titleId} summary={state.summary} {...actions} />}
    </section>
  );
}
