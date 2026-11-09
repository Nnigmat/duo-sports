import { useEffect, useState } from 'react';
import { DEFAULT_START_DELAY_SEC } from '../../../../../shared/types';
import { Button } from '../../../ui/Button/Button';
import { Dialog } from '../../../ui/Dialog/Dialog';
import { Icon } from '../../../ui/Icon/Icon';
import { IconButton } from '../../../ui/IconButton/IconButton';
import { Text } from '../../../ui/Text/Text';
import { cx } from '../../../ui/cx';
import { formatZoom } from '../flow';
import type { Beeper } from '../sound/beeper';
import styles from './RecordingScreen.module.css';
import { useRecorder, type RecorderStatus } from './useRecorder';

type Props = {
  /** «Круг 2 · подход 4 из 9» */
  eyebrow: string;
  /** «Обратные отжимания · 18–20 повт» */
  line: string;
  /** Загрузить записанное видео и привязать к подходу; экран ждёт промис. Ошибка показывается, повтор возможен. */
  /** durationSec — длина записи в целых секундах */
  onUpload: (video: Blob, durationSec: number) => Promise<void>;
  /** Записи не будет: «Отмена» до начала записи или «Удалить» после неё. Камера выключается, видео отбрасывается. */
  onCancel: () => void;
  /** Секунд между «Начать запись» и началом записи; 0 — сразу */
  startDelaySec?: number;
  /** Звук отсчёта; без него отсчёт идёт молча */
  beeper?: Beeper;
};

type Problem = Exclude<RecorderStatus, 'starting' | 'ready' | 'countdown' | 'recording' | 'stopped'>;

const PROBLEMS: Record<Problem, { title: string; text: string }> = {
  denied: {
    title: 'Нет доступа к камере',
    text: 'Разрешите камеру в настройках браузера и откройте экран снова.',
  },
  unsupported: {
    title: 'Запись недоступна',
    text: 'Браузер не умеет снимать видео, или страница открыта без https. Подход можно выполнить без записи.',
  },
  error: {
    title: 'Камера не запустилась',
    text: 'Возможно, её занимает другое приложение. Закройте его и попробуйте снова.',
  },
};

/**
 * Экран записи подхода: «Начать запись» с отсчётом и сигналами, красная рамка и «Идёт запись»,
 * «Остановить», затем просмотр со звуком по тапу и «Сбросить» / «Отправить».
 */
export function RecordingScreen({ eyebrow, line, onUpload, onCancel, startDelaySec = DEFAULT_START_DELAY_SEC, beeper }: Props) {
  const rec = useRecorder(beeper?.play);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Файл остаётся после неудачной загрузки: повтор не требует снимать заново
  const [blob, setBlob] = useState<Blob | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const { status } = rec;
  const ready = status === 'ready';
  const counting = status === 'countdown';
  const recording = status === 'recording';
  const stopped = status === 'stopped' && blob !== null;
  const live = ready || counting || recording;
  const problem = status in PROBLEMS ? PROBLEMS[status as Problem] : null;

  async function stop() {
    setError(null);
    try {
      setBlob(await rec.stop());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось остановить запись');
    }
  }

  async function send() {
    if (!blob) return;
    setSaving(true);
    setError(null);
    try {
      await onUpload(blob, Math.round(rec.elapsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить видео');
      setSaving(false);
    }
  }

  function cancel() {
    rec.discard();
    onCancel();
  }

  const hint = ready
    ? startDelaySec > 0
      ? `Поставьте телефон и нажмите «Начать запись». Запись начнётся через ${startDelaySec} с.`
      : 'Поставьте телефон и нажмите «Начать запись».'
    : counting
      ? 'Займите позу: запись начнётся после длинного сигнала.'
      : stopped
        ? 'Нажмите на кадр, чтобы посмотреть запись со звуком.'
        : null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        {recording ? (
          <span className={styles.rec} role="status">
            <span className={styles.dot} aria-hidden="true" />
            Идёт запись
          </span>
        ) : ready || status === 'starting' ? (
          <IconButton bare icon="close" aria-label="Отмена" className={styles.switch} onClick={cancel} />
        ) : (
          <span />
        )}
        {ready && (
          <IconButton
            bare
            icon="flipCamera"
            aria-label="Сменить камеру"
            className={styles.switch}
            onClick={rec.switchCamera}
          />
        )}
      </header>

      <div className={styles.preview} data-state={recording ? 'recording' : stopped ? 'review' : 'idle'}>
        <video ref={rec.setVideo} className={styles.video} muted playsInline autoPlay hidden={!live} />
        {counting && (
          <div className={styles.countdown} role="status" aria-label={`Запись начнётся через ${rec.countdownLeft} с`}>
            <span className={styles.countdownNumber} aria-hidden="true">
              {rec.countdownLeft}
            </span>
          </div>
        )}
        {ready && rec.zoomRange && (
          <label className={styles.zoom}>
            <span className={styles.zoomValue}>{formatZoom(rec.zoom)}</span>
            <input
              type="range"
              className={styles.zoomSlider}
              aria-label="Масштаб"
              aria-valuetext={formatZoom(rec.zoom)}
              min={rec.zoomRange.min}
              max={rec.zoomRange.max}
              step={rec.zoomRange.step}
              value={rec.zoom}
              onChange={(e) => rec.setZoom(Number(e.target.value))}
            />
          </label>
        )}
        {stopped && blob && <Review blob={blob} />}
        {!live && status !== 'stopped' && (
          <div className={styles.placeholder} role={problem ? 'alert' : 'status'}>
            <Icon name="camera" size={24} className={styles.placeholderIcon} />
            <Text variant="h5" tag="p" className={styles.placeholderTitle}>
              {problem ? problem.title : 'Включаем камеру'}
            </Text>
            {problem && (
              <Text variant="body-sm" className={styles.placeholderText}>
                {problem.text}
              </Text>
            )}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.titles}>
          <Text variant="eyebrow">{eyebrow}</Text>
          <Text variant="h5" tag="p">
            {line}
          </Text>
        </div>

        {problem ? (
          <Button variant="secondary" fullWidth onClick={cancel}>
            Назад
          </Button>
        ) : (
          <>
            {stopped ? (
              <div className={styles.actions}>
                <Button variant="secondary" fullWidth disabled={saving} onClick={() => setConfirmDiscard(true)}>
                  Сбросить
                </Button>
                <Button fullWidth loading={saving} onClick={send}>
                  Отправить
                </Button>
              </div>
            ) : recording ? (
              <Button variant="danger" fullWidth onClick={stop}>
                Остановить
              </Button>
            ) : counting ? (
              <Button variant="secondary" fullWidth onClick={rec.cancelCountdown}>
                Отмена
              </Button>
            ) : (
              <Button
                fullWidth
                disabled={!ready}
                onClick={() => {
                  beeper?.unlock();
                  rec.begin(startDelaySec);
                }}
              >
                Начать запись
              </Button>
            )}
            {error ? (
              <Text variant="caption" color="slate" role="alert">
                {error}.{stopped ? ' Нажмите «Отправить», чтобы повторить.' : ''}
              </Text>
            ) : (
              hint && (
                <Text variant="caption" color="slate">
                  {hint}
                </Text>
              )
            )}
            {!rec.withAudio && (
              <Text variant="caption" color="slate" role="status">
                Нет доступа к микрофону, видео будет без звука
              </Text>
            )}
          </>
        )}
      </div>

      <Dialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Удалить видео?"
        description="Запись удалится с телефона, вернуть её не получится."
        confirmLabel="Удалить"
        cancelLabel="Оставить"
        danger
        onConfirm={() => {
          setConfirmDiscard(false);
          cancel();
        }}
      />
    </div>
  );
}

/** Просмотр записанного: тап по кадру запускает и ставит на паузу, звук включён */
function Review({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  function toggle() {
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }

  return (
    <button
      type="button"
      className={styles.reviewTap}
      aria-label={playing ? 'Поставить запись на паузу' : 'Смотреть запись'}
      onClick={toggle}
    >
      {url && (
        // biome-ignore lint/a11y/useMediaCaption: короткое видео самого пользователя, субтитров нет
        <video
          ref={setVideo}
          className={styles.video}
          src={url}
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <span className={cx(styles.playMark, playing && styles.playMarkHidden)} aria-hidden="true">
        <Icon name="play" size={24} />
      </span>
    </button>
  );
}
