import { useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import { IconButton } from '../../../ui/IconButton/IconButton';
import { Icon } from '../../../ui/Icon/Icon';
import { Text } from '../../../ui/Text/Text';
import { formatTime, formatZoom } from '../flow';
import styles from './RecordingScreen.module.css';
import { useRecorder, type RecorderStatus } from './useRecorder';

/** Время поставить телефон и занять позу: для статики вроде планки на 30 с без паузы не обойтись */
export const DEFAULT_START_DELAY_SEC = 5;

type Props = {
  /** «Круг 2 · подход 4 из 9» */
  eyebrow: string;
  /** «Обратные отжимания · 18–20 повт» */
  line: string;
  /** Загрузить записанное видео и привязать к подходу; экран ждёт промис. Ошибка показывается, повтор возможен. */
  /** durationSec — длина записи в целых секундах */
  onUpload: (video: Blob, durationSec: number) => Promise<void>;
  /** Записи не будет: «Отмена», «Стоп» или «Назад». Камера выключается, видео отбрасывается. */
  onCancel: () => void;
  /** Секунд между «Старт» и началом записи; 0 — сразу */
  startDelaySec?: number;
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

/** Экран записи подхода: превью, «Старт» с отсчётом, REC, «Стоп» и «Готово». */
export function RecordingScreen({ eyebrow, line, onUpload, onCancel, startDelaySec = DEFAULT_START_DELAY_SEC }: Props) {
  const rec = useRecorder();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Файл остаётся после неудачной загрузки: повтор не требует снимать заново
  const [blob, setBlob] = useState<Blob | null>(null);

  const { status } = rec;
  const ready = status === 'ready';
  const counting = status === 'countdown';
  const recording = status === 'recording';
  const stopped = status === 'stopped';
  const live = ready || counting || recording;
  const problem = status in PROBLEMS ? PROBLEMS[status as Problem] : null;

  async function done() {
    setSaving(true);
    setError(null);
    try {
      const file = blob ?? (await rec.stop());
      setBlob(file);
      await onUpload(file, Math.round(rec.elapsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить видео');
      setSaving(false);
    }
  }

  function cancel() {
    rec.discard();
    onCancel();
  }

  const hint = ready
    ? startDelaySec > 0
      ? `Поставьте телефон и нажмите «Старт». Запись начнётся через ${startDelaySec} с.`
      : 'Поставьте телефон и нажмите «Старт».'
    : counting
      ? 'Займите позу: запись начнётся, когда отсчёт дойдёт до нуля.'
      : '«Готово» сохранит видео к подходу. Если уйти со страницы, запись остановится.';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        {recording ? (
          <span className={styles.rec} aria-hidden="true">
            <span className={styles.dot} />
            REC
            <span className={styles.recTime}>{formatTime(rec.elapsed)}</span>
          </span>
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

      <div className={styles.preview}>
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
        {!live && (
          <div className={styles.placeholder} role={problem ? 'alert' : 'status'}>
            <Icon name="camera" size={24} className={styles.placeholderIcon} />
            <Text variant="h5" tag="p" className={styles.placeholderTitle}>
              {problem ? problem.title : stopped ? 'Запись остановлена' : 'Включаем камеру'}
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
            <div className={styles.controls}>
              {counting ? (
                <IconButton size="md" icon="close" aria-label="Отмена" onClick={rec.cancelCountdown} />
              ) : ready || status === 'starting' ? (
                <IconButton size="md" icon="close" aria-label="Отмена" onClick={cancel} />
              ) : (
                <IconButton size="md" aria-label="Стоп" disabled={saving} onClick={cancel}>
                  <span className={styles.stopMark} />
                </IconButton>
              )}

              <span className={styles.bigTime} role="timer" aria-label={timerLabel(status, rec.elapsed, rec.countdownLeft)}>
                {counting ? rec.countdownLeft : formatTime(recording || stopped ? rec.elapsed : 0)}
              </span>

              {recording || stopped ? (
                <IconButton
                  size="lg"
                  icon="check"
                  aria-label={saving ? 'Сохраняем' : 'Готово'}
                  caption={saving ? 'Сохраняем' : 'Готово'}
                  disabled={saving}
                  onClick={done}
                />
              ) : (
                <IconButton
                  size="lg"
                  icon="play"
                  aria-label="Старт"
                  caption="Старт"
                  disabled={!ready}
                  onClick={() => rec.begin(startDelaySec)}
                />
              )}
            </div>
            {error ? (
              <Text variant="caption" color="slate" role="alert">
                {error}. Нажмите «Готово», чтобы повторить.
              </Text>
            ) : (
              <Text variant="caption" color="slate">
                {hint}
              </Text>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function timerLabel(status: RecorderStatus, elapsed: number, left: number): string {
  if (status === 'countdown') return `До начала записи ${left} с`;
  if (status === 'recording') return `Идёт запись ${formatTime(elapsed)}`;
  if (status === 'stopped') return `Записано ${formatTime(elapsed)}`;
  return 'Запись не начата';
}
