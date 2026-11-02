import { ActionList, Sheet } from '../../../ui';

/** Сроки паузы: дней подряд, начиная с сегодня */
export const PAUSE_OPTIONS = [
  { days: 7, title: 'На неделю' },
  { days: 14, title: 'На 2 недели' },
  { days: 30, title: 'На месяц' },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  /** Сколько дней пауза, считая сегодня */
  onPick: (days: number) => void;
};

/** Панель выбора срока паузы. Тренировки на это время не считаются пропущенными, серия недель не обрывается. */
export function PauseSheet({ open, onOpenChange, onBack, onPick }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} onBack={onBack} title="Поставить план на паузу" eyebrow="Серия не прервётся">
      <ActionList items={PAUSE_OPTIONS.map((o) => ({ id: String(o.days), icon: 'pause', title: o.title, onSelect: () => onPick(o.days) }))} />
    </Sheet>
  );
}
