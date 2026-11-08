import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampZoom,
  openCamera,
  pickMimeType,
  recordStartView,
  startSignalAt,
  zoomRange,
  type Signal,
  type Facing,
  type ZoomRange,
} from '../flow';

export type { Facing };

export type RecorderStatus =
  /** ждём доступ к камере */
  | 'starting'
  /** камера показывает превью, запись не идёт: можно поставить телефон */
  | 'ready'
  /** идёт отсчёт до начала записи */
  | 'countdown'
  | 'recording'
  /** запись остановлена, файл у вызывающего; камера выключена */
  | 'stopped'
  /** пользователь не дал доступ к камере */
  | 'denied'
  /** нет камеры или браузер не умеет записывать (в том числе страница без https) */
  | 'unsupported'
  /** камера занята или не найдена */
  | 'error';

function unsupported(): boolean {
  return !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined';
}

/**
 * Камера, превью и запись. Камера включается сразу, а запись только по `begin()`: сначала отсчёт
 * (время поставить телефон и занять позу), потом запись. Смена камеры доступна до начала записи.
 * Уход со страницы выключает камеру и отбрасывает запись.
 */
export function useRecorder(onSignal?: (signal: Signal) => void) {
  const [status, setStatus] = useState<RecorderStatus>(() => (unsupported() ? 'unsupported' : 'starting'));
  const [facing, setFacing] = useState<Facing>('environment');
  const [elapsed, setElapsed] = useState(0);
  // Момент нажатия «Начать запись» и длина отсчёта; null — отсчёта нет
  const [countdown, setCountdown] = useState<{ startedAt: number; leadSec: number } | null>(null);
  const [countdownLeft, setCountdownLeft] = useState(0);
  const signalRef = useRef(onSignal);
  signalRef.current = onSignal;
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  // null: камера не умеет зум, контрол не показываем
  const [range, setRange] = useState<ZoomRange | null>(null);
  const [zoom, setZoomValue] = useState(1);
  // false: микрофон не дали, видео запишется без звука
  const [withAudio, setWithAudio] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);

  const release = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    if (unsupported()) return;
    let cancelled = false;
    setStatus('starting');
    // Предупреждение про микрофон относится к прошлому потоку, пока новый не открыт
    setWithAudio(true);
    setElapsed(0);
    setCountdown(null);
    setRange(null);

    openCamera((c) => navigator.mediaDevices.getUserMedia(c), facing)
      .then(({ stream, withAudio: hasAudio }) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        streamRef.current = stream;
        recorderRef.current = recorder;
        setWithAudio(hasAudio);
        // Диапазоны зума у фронтальной и основной камер разные: начинаем с минимума новой камеры
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as { zoom?: { min?: number; max?: number; step?: number } } | undefined;
        const zoomCaps = zoomRange(caps?.zoom);
        setRange(zoomCaps);
        setZoomValue(zoomCaps?.min ?? 1);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        setStatus(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotSupportedError' || name === 'TypeError'
              ? 'unsupported'
              : 'error',
        );
      });

    return () => {
      cancelled = true;
      release();
    };
  }, [facing, release]);

  // Превью: подключаем поток к <video>, как только есть и элемент, и поток
  const live = status === 'ready' || status === 'countdown' || status === 'recording';
  useEffect(() => {
    if (video && live && video.srcObject !== streamRef.current) video.srcObject = streamRef.current;
  }, [video, live]);

  const startRecording = useCallback(() => {
    recorderRef.current?.start(1000);
    recordStartRef.current = Date.now();
    setCountdown(null);
    setStatus('recording');
  }, []);

  // Отсчёт до записи: по часам, чтобы вкладка в фоне не сбивала время. Сигнал звучит один раз на секунду.
  useEffect(() => {
    if (status !== 'countdown' || !countdown) return;
    const { startedAt, leadSec } = countdown;
    let lastSecond = 0;
    const id = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const second = Math.floor(elapsedMs / 1000);
      // Вкладка могла уснуть: звучит только сигнал текущей секунды, без пачки пропущенных
      if (second > lastSecond) {
        lastSecond = second;
        const signal = startSignalAt(leadSec, second);
        if (signal) signalRef.current?.(signal);
      }
      const view = recordStartView(leadSec, elapsedMs);
      setCountdownLeft(view.left);
      if (view.record) startRecording();
    }, 100);
    return () => clearInterval(id);
  }, [status, countdown, startRecording]);

  useEffect(() => {
    if (status !== 'recording') return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [status]);

  /** «Начать запись»: отсчёт delaySec секунд с сигналами, длинный сигнал, затем запись; при 0 — сразу. */
  const begin = useCallback(
    (delaySec: number) => {
      if (!recorderRef.current) return;
      if (delaySec <= 0) {
        startRecording();
        return;
      }
      const first = startSignalAt(delaySec, 0);
      if (first) signalRef.current?.(first);
      setCountdownLeft(delaySec);
      setCountdown({ startedAt: Date.now(), leadSec: delaySec });
      setStatus('countdown');
    },
    [startRecording],
  );

  /** Отменить отсчёт: назад к превью, камера остаётся включённой. */
  const cancelCountdown = useCallback(() => {
    setCountdown(null);
    setStatus('ready');
  }, []);

  /** Остановить запись и получить файл; камера выключается. */
  const stop = useCallback(
    () =>
      new Promise<Blob>((resolve, reject) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
          reject(new Error('Запись не идёт'));
          return;
        }
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          release();
          setElapsed(Math.round((Date.now() - recordStartRef.current) / 1000));
          setStatus('stopped');
          resolve(blob);
        };
        recorder.stop();
      }),
    [release],
  );

  /** Зум камеры: меняет и превью, и будущую запись. Без поддержки камеры ничего не делает. */
  const setZoom = useCallback(
    (value: number) => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!range || !track) return;
      const next = clampZoom(value, range);
      setZoomValue(next);
      // advanced: зум не обязателен, лучше пропустить, чем упасть на неподдерживаемом
      track.applyConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] }).catch(() => {});
    },
    [range],
  );

  const switchCamera = useCallback(() => setFacing((f) => (f === 'environment' ? 'user' : 'environment')), []);

  return {
    status,
    elapsed,
    /** Секунд до начала записи, пока идёт отсчёт */
    countdownLeft,
    setVideo,
    begin,
    cancelCountdown,
    stop,
    discard: release,
    switchCamera,
    /** Диапазон зума или null, если камера его не умеет */
    zoomRange: range,
    zoom,
    setZoom,
    /** В записи будет звук; false, если микрофон не разрешён */
    withAudio,
  };
}
