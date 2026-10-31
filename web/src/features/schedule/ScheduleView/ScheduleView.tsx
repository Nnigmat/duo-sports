import type { ScheduleData } from '../../../data/types';
import { RescheduleSheet } from '../RescheduleSheet/RescheduleSheet';

type Props = {
  data: ScheduleData;
  onReschedule: (date: string) => void;
  onSkip: () => void;
  onPause: () => void;
  onClose: () => void;
};

export function ScheduleView({ data, onReschedule, onSkip, onPause, onClose }: Props) {
  return (
    <RescheduleSheet
      open
      onOpenChange={(open) => !open && onClose()}
      data={data}
      onConfirm={onReschedule}
      onSkip={onSkip}
      onPause={onPause}
    />
  );
}
