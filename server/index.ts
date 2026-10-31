import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { videosRouter } from './videos';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Видео живут файлами в data/videos, в базе будет только путь
const dataDir = path.resolve(process.env.DATA_DIR || 'data');
app.use('/api', videosRouter({ dir: path.join(dataDir, 'videos'), maxBytes: 300 * 1024 * 1024 }));

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
