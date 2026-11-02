import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import { activeComment, clampSeek, formatTime, nextSpeed, prevNext, speedLabel, type PlayerComment } from './player';
import styles from './VideoPlayer.module.css';

const SKIP_SEC = 5;

export interface VideoPlayerHandle {
  /** Перейти к секунде и поставить на паузу */
  seek: (sec: number) => void;
}

type Props = {
  /** Адрес файла; без него показывается «Видео не загружено» */
  src?: string;
  durationSec: number;
  comments: PlayerComment[];
  /** Название упражнения поверх видео */
  title?: string;
  /** «Подход 4 · 80 кг × 5» */
  subtitle?: string;
  /** Слева сверху поверх видео, например кнопка «назад» */
  overlayStart?: ReactNode;
  onTimeChange?: (sec: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Перешли к комментарию кнопкой, меткой на шкале или стрелками */
  onCommentSelect?: (id: string) => void;
  ref?: Ref<VideoPlayerHandle>;
  className?: string;
};

/** Плеер разбора: нативный <video>, метки комментариев на шкале, замедление, перемотка ±5 с. */
export function VideoPlayer({
  src,
  durationSec,
  comments,
  title,
  subtitle,
  overlayStart,
  onTimeChange,
  onPlayingChange,
  onCommentSelect,
  ref,
  className,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(durationSec);
  const ready = Boolean(src) && !failed;

  useEffect(() => setDuration(durationSec), [durationSec]);
  useEffect(() => setFailed(false), [src]);

  const update = (t: number) => {
    setTime(t);
    onTimeChange?.(t);
  };
  const seek = (sec: number) => {
    const el = video.current;
    const t = clampSeek(sec, 0, duration);
    if (el) {
      el.currentTime = t;
      el.pause();
    }
    update(t);
  };
  useImperativeHandle(ref, () => ({ seek }));

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      if (duration > 0 && el.currentTime >= duration - 0.1) el.currentTime = 0;
      void el.play().catch(() => setPlaying(false));
    } else el.pause();
  };
  const skip = (delta: number) => {
    const el = video.current;
    if (!el) return;
    const t = clampSeek(el.currentTime, delta, duration);
    el.currentTime = t;
    update(t);
  };
  const jump = (id: string | null) => {
    const c = comments.find((x) => x.id === id);
    if (!c) return;
    seek(c.timecodeSec);
    onCommentSelect?.(c.id);
  };
  const cycleSpeed = () => {
    const r = nextSpeed(rate);
    setRate(r);
    if (video.current) video.current.playbackRate = r;
  };

  const active = activeComment(comments, time);
  const nav = prevNext(comments, time);
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const speedAria = `Скорость ${speedLabel(rate)}, нажми для смены`;

  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.stage}>
        {src && !failed && (
          <video
            ref={video}
            className={styles.video}
            src={src}
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
              e.currentTarget.playbackRate = rate;
            }}
            onTimeUpdate={(e) => update(e.currentTarget.currentTime)}
            onPlay={() => {
              setPlaying(true);
              onPlayingChange?.(true);
            }}
            onPause={() => {
              setPlaying(false);
              onPlayingChange?.(false);
            }}
            onError={() => setFailed(true)}
          />
        )}
        {!ready && (
          <p className={styles.empty} role="status">
            <Icon name="video" />
            {failed ? 'Видео не открылось' : 'Видео не загружено'}
          </p>
        )}
        <div className={styles.overlay}>
          <div className={styles.top}>
            {overlayStart}
            {(title || subtitle) && (
              <div className={styles.titleBox}>
                {title && <span className={styles.title}>{title}</span>}
                {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
              </div>
            )}
          </div>
          <div className={styles.center}>
            <button type="button" className={styles.skip} disabled={!ready} aria-label="−5 с, назад" onClick={() => skip(-SKIP_SEC)}>
              −5 с
            </button>
            <button type="button" className={styles.play} disabled={!ready} aria-label={playing ? 'Пауза' : 'Играть'} onClick={togglePlay}>
              <Icon name={playing ? 'pause' : 'play'} className={playing ? undefined : styles.playGlyph} />
            </button>
            <button type="button" className={styles.skip} disabled={!ready} aria-label="+5 с, вперёд" onClick={() => skip(SKIP_SEC)}>
              +5 с
            </button>
          </div>
          <div className={styles.live} aria-live="polite">
            {active && (
              <div className={styles.bubble}>
                <span className={styles.who}>
                  <Icon name="comment" size={20} className={styles.whoIcon} />
                  {active.author} · {formatTime(active.timecodeSec)}
                </span>
                <span className={styles.bubbleText}>{active.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.scrub} style={{ '--pct': `${pct}%` } as CSSProperties}>
          <span className={styles.track} aria-hidden="true" />
          <span className={styles.fill} aria-hidden="true" />
          <input
            type="range"
            className={styles.range}
            min={0}
            max={Math.max(duration, 0)}
            step={0.1}
            value={Math.min(time, duration)}
            disabled={!ready}
            aria-label="Позиция в видео"
            aria-valuetext={`${formatTime(time)} из ${formatTime(duration)}`}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (video.current) video.current.currentTime = t;
              update(t);
            }}
          />
          {comments.map((c) => {
            const on = active?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={styles.marker}
                style={{ left: `calc(${duration > 0 ? (c.timecodeSec / duration) * 100 : 0}% - 16px)` }}
                disabled={!ready}
                aria-label={`${c.author}, комментарий на ${formatTime(c.timecodeSec)}`}
                aria-current={on ? 'true' : undefined}
                onClick={() => jump(c.id)}
              >
                <span className={cx(styles.dot, on && styles.dotOn)} />
              </button>
            );
          })}
        </div>
        <div className={styles.row}>
          <span className={styles.time}>
            {formatTime(time)} <span className={styles.total}>/ {formatTime(duration)}</span>
          </span>
          <div className={styles.nav}>
            <button type="button" className={styles.square} disabled={!ready || !nav.prev} aria-label="Предыдущий комментарий" onClick={() => jump(nav.prev)}>
              <Icon name="back" size={20} />
            </button>
            <span className={styles.pos}>{nav.total === 0 ? '0 из 0' : `${nav.position || '–'} из ${nav.total}`}</span>
            <button type="button" className={styles.square} disabled={!ready || !nav.next} aria-label="Следующий комментарий" onClick={() => jump(nav.next)}>
              <Icon name="chevronRight" size={20} />
            </button>
            <button type="button" className={styles.speed} disabled={!ready} aria-label={speedAria} onClick={cycleSpeed}>
              {speedLabel(rate)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
