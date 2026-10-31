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
