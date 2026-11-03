import pino from 'pino';
import { pinoHttp } from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
});

/** Одна строка JSON на запрос: метод, адрес, статус, время. Проверку живости не пишем. */
export const requestLogger = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/api/health' },
  customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
