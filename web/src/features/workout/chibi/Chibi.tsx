import type { CSSProperties } from 'react';
import type { Pose } from '../../../../../shared/types';
import { cx } from '../../../ui/cx';
import styles from './Chibi.module.css';
import { OVERLAY_NODES, PART_NODES } from './parts';
import { FACES, type Face } from './faces';
import { POSE_CONFIG } from './poseConfig';

export interface ChibiProps {
  pose: Pose;
  /** Сторона квадрата в px */
  size?: number;
  /** Множитель скорости анимации: 0,5 — замедленно */
  speed?: number;
  /** Выражение лица; без него обычное (как «нейтральное») */
  face?: Face;
  /** Медаль на ленте на груди: заглушка до финальной графики */
  medal?: boolean;
  /** Поставить анимацию на паузу */
  paused?: boolean;
  className?: string;
}

export function Chibi({ pose, size = 300, speed, paused, face = 'neutral', medal, className }: ChibiProps) {
  const cfg = POSE_CONFIG[pose];
  const f = FACES[face];

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      role="img"
      aria-label={medal ? `${cfg.alt}, на груди медаль` : cfg.alt}
      className={cx(styles.svg, className)}
      data-paused={paused ? 'true' : undefined}
      style={speed ? ({ '--chibi-speed': speed } as CSSProperties) : undefined}
    >
      {cfg.parts.map((p) => (
        <g key={p}>{PART_NODES[p]}</g>
      ))}

      <g transform={cfg.head}>
        <g className={cx(styles.head, styles[cfg.motion])}>
          <circle cx="0" cy="-2" r="46" className={styles.fDark} />
          <ellipse cx="0" cy="6" rx="40" ry="37" className={styles.fSkin} />
          <path
            d="M-45 4 C-47 -30 -24 -50 0 -50 C26 -50 47 -30 45 4 C40 -10 30 -18 16 -20 C8 -12 -6 -10 -16 -16 C-26 -12 -36 -6 -45 4 Z"
            className={styles.fDark}
          />
          <ellipse cx="-24" cy="20" rx="7" ry="4" opacity="0.9" className={styles.fHighlightSoft} />
          <ellipse cx="24" cy="20" rx="7" ry="4" opacity="0.9" className={styles.fHighlightSoft} />
          <path d={f.eyeL} strokeWidth={f.eyeW} className={cx(styles.line, styles.sInk)} />
          <path d={f.eyeR} strokeWidth={f.eyeW} className={cx(styles.line, styles.sInk)} />
          {f.brows && <path d={f.brows} strokeWidth="3" className={cx(styles.line, styles.sBrow)} />}
          <path d={f.mouth} strokeWidth="3" className={cx(styles.line, styles.sMouth, f.mouthFilled && styles.fMouth)} />
        </g>
      </g>

      {cfg.parts.map((p) => {
        const overlay = OVERLAY_NODES[p];
        return overlay ? <g key={`o-${p}`}>{overlay}</g> : null;
      })}

      {medal && (
        <g>
          <path d="M138 130 L150 158 L162 130" strokeWidth="5" className={cx(styles.line, styles.sHighlight)} />
          <circle cx="150" cy="168" r="11" strokeWidth="3" className={cx(styles.fHighlightSoft, styles.sHighlight)} />
        </g>
      )}
    </svg>
  );
}
