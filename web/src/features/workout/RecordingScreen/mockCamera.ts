// Только для историй и тестов: подмена камеры, чтобы экран записи работал без реального устройства

/** Что подставить вместо камеры: поток-картинка, камера без микрофона (в том числе только при первом открытии), вечное ожидание или отказ */
export type Camera = 'stream' | 'no-mic' | 'no-mic-then-pending' | 'pending' | DOMException['name'] | 'no-api';

/** Анимированный поток из canvas: настоящий MediaStream, который умеет писать MediaRecorder */
function canvasStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d')!;
  const stream = canvas.captureStream(30);
  const track = stream.getVideoTracks()[0];
  // Как у Chrome на Android: зум объявлен в возможностях и принимается через applyConstraints
  track.getCapabilities = () => ({ zoom: { min: 1, max: 4, step: 0.1 } }) as MediaTrackCapabilities;
  track.applyConstraints = () => Promise.resolve();
  const draw = (t: number) => {
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(160 + Math.cos(t / 400) * 80, 120 + Math.sin(t / 400) * 50, 24, 0, Math.PI * 2);
    ctx.fill();
    if (track.readyState === 'live') requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  return stream;
}

/** Подмена камеры на время истории; возвращает откат */
export function mockCamera(kind: Camera) {
  const devices = navigator.mediaDevices;
  const original = devices?.getUserMedia;

  if (kind === 'no-api') {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    return () => {
      delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    };
  }

  devices.getUserMedia =
    kind === 'stream'
      ? () => Promise.resolve(canvasStream())
      : kind === 'no-mic-then-pending'
        ? (() => {
            let opened = 0;
            return (c: MediaStreamConstraints) => {
              opened += 1;
              if (opened > 2) return new Promise<MediaStream>(() => {});
              return c.audio ? Promise.reject(new DOMException('Подмена в истории', 'NotAllowedError')) : Promise.resolve(canvasStream());
            };
          })()
      : kind === 'no-mic'
        ? (c: MediaStreamConstraints) =>
            c.audio ? Promise.reject(new DOMException('Подмена в истории', 'NotAllowedError')) : Promise.resolve(canvasStream())
        : kind === 'pending'
        ? () => new Promise<MediaStream>(() => {})
        : () => Promise.reject(new DOMException('Подмена в истории', kind));
  return () => {
    devices.getUserMedia = original;
  };
}
