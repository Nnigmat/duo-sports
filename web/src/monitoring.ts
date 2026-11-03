import * as Sentry from '@sentry/react';

/** DSN задаётся при сборке (VITE_SENTRY_DSN). Без него и вне продакшена Sentry не включается. */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || !dsn) return;
  Sentry.init({
    dsn,
    release: __BUILD_ID__,
    dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
  });
}

export { Sentry };
