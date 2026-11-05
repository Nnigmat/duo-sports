import { type CSSProperties, useEffect, useRef } from 'react';
import styles from './DemoVideo.module.css';

type Props = {
  src: string;
  /** Файл не загрузился или не играет: экран возвращает статичного чибика */
  onFail: () => void;
  className?: string;
  style?: CSSProperties;
  /** Множитель скорости: 0,5 — замедленно */
  rate?: number;
  paused?: boolean;
};

/** Ролик чибика с упражнением: без звука, по кругу, сам. Декоративный: смысл несёт облачко над ним. */
export function DemoVideo({ src, onFail, className, style, rate = 1, paused }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = rate;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [rate, paused]);
  return (
    <video
      key={src}
      ref={ref}
      className={[styles.root, className].filter(Boolean).join(' ')}
      src={src}
      style={style}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onError={onFail}
      onLoadedMetadata={(e) => {
        e.currentTarget.playbackRate = rate;
      }}
    />
  );
}
