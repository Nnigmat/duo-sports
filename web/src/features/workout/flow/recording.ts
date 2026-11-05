/** Форматы по убыванию предпочтения: Chrome и Android пишут webm, Safari и iOS только mp4. */
const CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
];

/** Первый формат, который поддерживает браузер (`MediaRecorder.isTypeSupported`); иначе undefined. */
export function pickMimeType(isSupported: (type: string) => boolean): string | undefined {
  return CANDIDATES.find(isSupported);
}

/** Диапазон зума камеры, как его отдаёт `track.getCapabilities().zoom` */
export type ZoomRange = { min: number; max: number; step: number };

/** Диапазон зума, если им есть что управлять; иначе null (браузер зум не умеет или он фиксирован). */
export function zoomRange(caps: { min?: number; max?: number; step?: number } | undefined): ZoomRange | null {
  if (!caps || caps.min === undefined || caps.max === undefined || !(caps.max > caps.min)) return null;
  return { min: caps.min, max: caps.max, step: caps.step && caps.step > 0 ? caps.step : 0.1 };
}

/** Значение зума внутри диапазона и кратное шагу от минимума. */
export function clampZoom(value: number, { min, max, step }: ZoomRange): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(4))));
}

/** «2,0 ×»: одна цифра после запятой, как принято в русском тексте. */
export function formatZoom(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} ×`;
}
