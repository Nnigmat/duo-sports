import './instrument';
import * as Sentry from '@sentry/node';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { achievementsRouter } from './achievementsRouter';
import { authRouter } from './authRouter';
import { equipmentRouter } from './equipmentRouter';
import { exercisesRouter } from './exercisesRouter';
import { routinesRouter } from './routinesRouter';
import { importRouter } from './importRouter';
import { openDb } from './db';
import { planRouter } from './planRouter';
import { reviewRouter } from './reviewRouter';
import { workoutRouter } from './workoutRouter';
import { scheduleRouter } from './scheduleRouter';
import { todayRouter } from './todayRouter';
import { trainerRouter } from './trainerRouter';
import { videosRouter } from './videos';
import { demoRouter } from './demoRouter';
import { logger, requestLogger } from './logger';

const MAX_DEMO_BYTES = 50 * 1024 * 1024; // ролик чибика — секунды видео, не запись подхода

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(requestLogger);

// Импорт присылает до 500 тренировок за раз: лимит больше стандартных 100 КБ
app.use(express.json({ limit: '5mb' }));

// Видео живут файлами в data/videos, в базе будет только путь
const dataDir = path.resolve(process.env.DATA_DIR || 'data');
const db = openDb(path.join(dataDir, 'app.db'));
app.use('/api', authRouter(db));
app.use('/api', importRouter(db));
const videosDir = path.join(dataDir, 'videos');
app.use('/api', exercisesRouter(db, videosDir));
app.use('/api', equipmentRouter(db));
app.use('/api', routinesRouter(db));
app.use('/api', demoRouter({ db, dir: videosDir, maxBytes: MAX_DEMO_BYTES }));
app.use('/api', planRouter(db));
app.use('/api', workoutRouter(db));
app.use('/api', todayRouter(db));
app.use('/api', reviewRouter(db));
app.use('/api', trainerRouter(db));
app.use('/api', achievementsRouter(db));
app.use('/api', scheduleRouter(db));
app.use('/api', videosRouter({ db, dir: videosDir, maxBytes: 300 * 1024 * 1024 }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// Ошибки обработчиков: сначала в Sentry, потом ответ клиенту
Sentry.setupExpressErrorHandler(app);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err }, 'необработанная ошибка');
  if (!res.headersSent) res.status(500).json({ error: 'Внутренняя ошибка' });
});

app.listen(port, () => {
  logger.info(`Сервер: http://localhost:${port}`);
});
