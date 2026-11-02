import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { achievementsRouter } from './achievementsRouter';
import { authRouter } from './authRouter';
import { exercisesRouter } from './exercisesRouter';
import { importRouter } from './importRouter';
import { openDb } from './db';
import { planRouter } from './planRouter';
import { workoutRouter } from './workoutRouter';
import { scheduleRouter } from './scheduleRouter';
import { todayRouter } from './todayRouter';
import { videosRouter } from './videos';

const app = express();
const port = Number(process.env.PORT) || 3000;

// Импорт присылает до 500 тренировок за раз: лимит больше стандартных 100 КБ
app.use(express.json({ limit: '5mb' }));

// Видео живут файлами в data/videos, в базе будет только путь
const dataDir = path.resolve(process.env.DATA_DIR || 'data');
const db = openDb(path.join(dataDir, 'app.db'));
app.use('/api', authRouter(db));
app.use('/api', importRouter(db));
app.use('/api', exercisesRouter(db));
app.use('/api', planRouter(db));
app.use('/api', workoutRouter(db));
app.use('/api', todayRouter(db));
app.use('/api', achievementsRouter(db));
app.use('/api', scheduleRouter(db));
app.use('/api', videosRouter({ db, dir: path.join(dataDir, 'videos'), maxBytes: 300 * 1024 * 1024 }));

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

app.listen(port, () => {
  console.log(`Сервер: http://localhost:${port}`);
});
