import { useState } from 'react';
import { MEASUREMENT_KINDS } from '../../../../shared/measurements';
import type { MeasurementKind } from '../../../../shared/types';
import type { ChangeMode, Period } from './measurements';

export type MeasureStatsState = {
  visible: MeasurementKind[];
  period: Period;
  mode: ChangeMode;
  point: number | null;
  onVisible: (kinds: MeasurementKind[]) => void;
  onPeriod: (p: Period) => void;
  onMode: (m: ChangeMode) => void;
  onPoint: (i: number) => void;
};

/** Состояние экрана «Замеры»: видимые линии, период, режим и выбранная дата. При каждом открытии всё по умолчанию. */
export function useMeasureStatsState(): MeasureStatsState {
  const [visible, setVisible] = useState<MeasurementKind[]>([...MEASUREMENT_KINDS]);
  const [period, setPeriod] = useState<Period>('all');
  const [mode, setMode] = useState<ChangeMode>('percent');
  const [point, setPoint] = useState<number | null>(null);
  return {
    visible,
    period,
    mode,
    point,
    onVisible: (kinds) => setVisible(kinds),
    onPeriod: (p) => {
      setPeriod(p);
      setPoint(null);
    },
    onMode: (m) => setMode(m),
    onPoint: (i) => setPoint(i),
  };
}
