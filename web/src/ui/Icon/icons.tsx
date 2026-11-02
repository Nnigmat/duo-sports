import type { ReactNode } from 'react';

// Контуры на сетке 24×24; линия 2 px, round cap/join задаются в Icon.
export const icons = {
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  play: <path d="M7 5l12 7-12 7z" />,
  playCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l5 3.5-5 3.5z" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pause: <path d="M9 6v12M15 6v12" />,
  skip: (
    <>
      <path d="M6 6l8 6-8 6z" />
      <path d="M18 6v12" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  camera: (
    <>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3z" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v5h5" />
    </>
  ),
  flipCamera: (
    <>
      <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" />
      <path d="M20 4v4h-4M4 20v-4h4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.2.8 2 1.6 2.4C10.2 8 10.5 5.5 12 3z" />,
  kettlebell: (
    <>
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M8.5 8h7C19 9.5 20 12 20 14.5A3.5 3.5 0 0 1 16.5 18h-9A3.5 3.5 0 0 1 4 14.5C4 12 5 9.5 8.5 8z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
      <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4" />
      <path d="M12 14v4M8 20h8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12v.01" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9.5l5 2.5-5 2.5z" />
    </>
  ),
  loop: (
    <>
      <path d="M17 3l3 3-3 3" />
      <path d="M4 11V9a3 3 0 0 1 3-3h13" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M20 13v2a3 3 0 0 1-3 3H4" />
    </>
  ),
  duo: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  secret: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </>
  ),
  barbell: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  dumbbell: <path d="M7 9v6M17 9v6M4 10.5v3M20 10.5v3M7 12h10" />,
  machine: <path d="M5 3v18M19 3v18M5 7h14M9 11h6v8H9z" />,
  body: <path d="M10 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 6v7M8 21l4-8 4 8M6 10h12" />,
  timer: <path d="M4 14a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 10v4l3 2M9 2h6" />,
  rope: <path d="M6 3v6M18 3v6M6 9c0 7 2 12 6 12s6-5 6-12" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5" />
      <path d="M5 19h14" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </>
  ),
  calendar: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
    </>
  ),
  bars: <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />,
  forward: <path d="M9 5l7 7-7 7" />,
  copy: (
    <>
      <path d="M9 11a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10.6 10.6 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  comment: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;
