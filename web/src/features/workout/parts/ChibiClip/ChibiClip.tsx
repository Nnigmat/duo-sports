import { useState } from 'react';
import type { Pose } from '../../../../../../shared/types';
import { useMediaQuery } from '../../../../shared';
import { Chibi } from '../../chibi/Chibi';
import { DemoVideo } from '../DemoVideo/DemoVideo';
import styles from './ChibiClip.module.css';

type Props = {
  /** Ролик чибика; без него или при сбое показываем рисованного */
  src?: string;
  /** Поза рисованного чибика на случай, когда ролик не играет */
  pose: Pose;
  /** Высота в px */
  size: number;
  medal?: boolean;
  rate?: number;
  paused?: boolean;
  className?: string;
};

/** Чибик-ролик вне экрана тренировки. Рисованный остаётся запасным: при prefers-reduced-motion и если файл не загрузился. */
export function ChibiClip({ src, pose, size, medal, rate, paused, className }: Props) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [failed, setFailed] = useState<string | null>(null);
  const playing = src && !still && failed !== src ? src : undefined;
  if (!playing) return <Chibi pose={pose} size={size} medal={medal} speed={rate} paused={paused} className={className} />;
  return (
    <DemoVideo
      src={playing}
      onFail={() => setFailed(playing)}
      className={[styles.clip, className].filter(Boolean).join(' ')}
      style={{ height: size }}
      rate={rate}
      paused={paused}
    />
  );
}
