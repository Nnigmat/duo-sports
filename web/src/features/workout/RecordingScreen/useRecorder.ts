import { useCallback, useEffect, useRef, useState } from 'react';
import { isFinished, pickMimeType, remainingSec, startCountdown, type Countdown } from '../flow';

export type Facing = 'environment' | 'user';

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
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>(() => (unsupported() ? 'unsupported' : 'starting'));
  const [facing, setFacing] = useState<Facing>('environment');
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    setElapsed(0);
    setCountdown(null);

    navigator.mediaDevices
      // Без звука: тренеру нужна картинка, микрофон только добавил бы запрос доступа
      .getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false })
      .then((stream) => {
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
    setCountdown(null);
    setStatus('recording');
  }, []);

  // Отсчёт до записи: по часам, чтобы вкладка в фоне не сбивала время
  useEffect(() => {
    if (status !== 'countdown' || !countdown) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (isFinished(countdown, t)) startRecording();
    }, 100);
    return () => clearInterval(id);
  }, [status, countdown, startRecording]);

  useEffect(() => {
    if (status !== 'recording') return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [status]);

  /** «Старт»: через delaySec секунд начнётся запись; при 0 — сразу. */
  const begin = useCallback(
    (delaySec: number) => {
      if (!recorderRef.current) return;
      if (delaySec <= 0) {
        startRecording();
        return;
      }
      const t = Date.now();
      setNow(t);
      setCountdown(startCountdown(delaySec, t));
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
          setStatus('stopped');
          resolve(blob);
        };
        recorder.stop();
      }),
    [release],
  );

  const switchCamera = useCallback(() => setFacing((f) => (f === 'environment' ? 'user' : 'environment')), []);

  return {
    status,
    elapsed,
    /** Секунд до начала записи, пока идёт отсчёт */
    countdownLeft: countdown ? remainingSec(countdown, now) : 0,
    setVideo,
    begin,
    cancelCountdown,
    stop,
    discard: release,
    switchCamera,
  };
}
