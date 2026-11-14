import { useId } from 'react';
import type { Gender, Pose } from '../../../../../shared/types';
import type { TodayState } from '../../../data/types';
import { cx } from '../../../ui/cx';
import { idleUrl, restUrl, successUrl } from '../../workout/chibi/idle';
import { MeasureReminderCard } from '../MeasureReminderCard/MeasureReminderCard';
import { ChibiClip } from '../../workout/parts/ChibiClip/ChibiClip';
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
  /** Адрес карточки упражнения; без него (или если упражнения нет в библиотеке) название остаётся текстом */
  exerciseHref?: (name: string) => string | undefined;
  onOpenExercise?: (href: string) => void;
};

type Props = TodayHeroActions & {
  state: TodayState;
  /** Напоминание о замерах под чибиком; показывается, только если переданы оба свойства */
  measureReminder?: { daysSince: number | null };
  onMeasure?: () => void;
  /** Пол спортсмена: каким чибиком показать ролик */
  gender?: Gender;
  className?: string;
};

const POSE: Record<TodayState['kind'], Pose> = { workout: 'wave', rest: 'rest', done: 'cheer' };

const CLIP: Record<TodayState['kind'], (gender?: Gender) => string> = { workout: idleUrl, rest: restUrl, done: successUrl };

/** Чибик и карточка дня: тренировка, отдых или сделано. */
export function TodayHero({ state, gender, className, measureReminder, onMeasure, ...actions }: Props) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cx(styles.hero, className)}>
      <div className={styles.side}>
        <div className={styles.disk}>
          <ChibiClip src={CLIP[state.kind](gender)} pose={POSE[state.kind]} size={176} />
        </div>
        {measureReminder && onMeasure && <MeasureReminderCard daysSince={measureReminder.daysSince} onMeasure={onMeasure} />}
      </div>
      {state.kind === 'workout' && <WorkoutCard titleId={titleId} workout={state.workout} {...actions} />}
      {state.kind === 'rest' && <RestCard titleId={titleId} next={state.next} {...actions} />}
      {state.kind === 'done' && <DoneCard titleId={titleId} summary={state.summary} {...actions} />}
    </section>
  );
}
