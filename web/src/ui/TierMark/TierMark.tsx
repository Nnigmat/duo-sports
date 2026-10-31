import type { CSSProperties } from 'react';
import { cx } from '../cx';
import type { Tier } from '../labels';
import styles from './TierMark.module.css';

/** Цвета уровней из макета «Достижения». Токенов под металл нет, поэтому держим их здесь. */
const PALETTE = [
  null,
  { fill: '#d99a62', ring: '#a2602d', tint: '#f6e3d2', ink: '#6b3d14' },
  { fill: '#d3d8dd', ring: '#8a929a', tint: '#e9ecef', ink: '#3d4349' },
  { fill: '#f2c94c', ring: '#b8860b', tint: '#fcefc4', ink: '#6b4e00' },
] as const;

/** CSS-переменные уровня; для tier 0 пусто: там цвета из токенов. */
export function tierVars(tier: Tier): CSSProperties {
  const p = PALETTE[tier];
  if (!p) return {};
  return { '--tier-fill': p.fill, '--tier-ring': p.ring, '--tier-tint': p.tint, '--tier-ink': p.ink } as CSSProperties;
}

/** Форма несёт уровень не только цветом: круг, шестиугольник, щит. */
const SHAPES = [
  'M3 28a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z',
  'M3 28a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z',
  'M28 3L49.7 15.5V40.5L28 53L6.3 40.5V15.5Z',
  'M28 3L50 10V27C50 40 41 49 28 54C15 49 6 40 6 27V10Z',
] as const;

type Props = {
  /** 0 — пунктирный круг «нет», 1 — бронза, 2 — серебро, 3 — золото */
  tier: Tier;
  /** Сторона квадрата, px */
  size?: number;
  /** Толщина обводки в единицах viewBox 56: 2,5 на медали, 4 в легенде */
  stroke?: number;
  /** Кольцо серии вокруг формы */
  streak?: boolean;
  className?: string;
};

/** Только форма уровня, без значка внутри. Декор: смысл всегда в подписи рядом. */
export function TierMark({ tier, size = 24, stroke = 2.5, streak, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
      className={cx(styles.mark, tier === 0 && styles.empty, className)}
      style={tierVars(tier)}
    >
      {streak && <circle cx="28" cy="28" r="31" fill="none" strokeWidth="2" className={styles.streak} />}
      <path
        d={SHAPES[tier]}
        strokeWidth={stroke}
        strokeLinejoin="round"
        strokeDasharray={tier === 0 ? (stroke >= 4 ? '6 5' : '4 3') : undefined}
      />
    </svg>
  );
}
