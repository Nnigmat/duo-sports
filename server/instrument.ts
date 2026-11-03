// Подключается первым в index.ts. Без SENTRY_DSN Sentry молчит (в разработке и тестах).
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Токен сессии в куке и пароли в теле запроса в Sentry не отправляем
    dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
  });
}
