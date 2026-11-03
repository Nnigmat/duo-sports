/** Кладёт готовые ролики из web/assets/exercise-video в библиотеку: npm run seed-demo */
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { libraryIndex, libraryOf } from './comments';
import { openDb, type Db } from './db';
import { setDemo } from './exercises';

/** Папка с файлами и название упражнения в библиотеке; пол определён по кадрам роликов */
export const DEMO_MANIFEST: Array<{ folder: string; exercise: string; female: string; male: string }> = [
  { folder: 'Отжимания с касанием предмета', exercise: 'Отжимания с касанием предмета', female: 'gemini_generated_video_ef3ee9ac.mp4', male: 'gemini_generated_video_4c7f5e40.mp4' },
  { folder: 'Отжимание от скамьи', exercise: 'Обратные отжимания от лавочки', female: 'gemini_generated_video_ac461cfd.mp4', male: 'gemini_generated_video_ee69dfb5.mp4' },
  { folder: 'Подтягивание колен', exercise: 'Подтягивание колен в висе', female: 'gemini_generated_video_12bd6f91.mp4', male: 'gemini_generated_video_8697860e.mp4' },
  { folder: 'Выпады', exercise: 'Выпады на месте', female: 'gemini_generated_video_2eb39207.mp4', male: 'gemini_generated_video_e4cc22c4.mp4' },
  { folder: 'Ножницы', exercise: 'Ножницы лёжа', female: 'gemini_generated_video_4de3b527.mp4', male: 'gemini_generated_video_daa559e8.mp4' },
  { folder: 'Лодочка', exercise: 'Лодочка', female: 'gemini_generated_video_e4e25f36.mp4', male: 'gemini_generated_video_633cc195.mp4' },
];

/** Упражнение ищется по названию или псевдониму (`exercise`); ненайденные и без файлов попадают в missing, ничего не создаётся */
export async function seedDemo(db: Db, dataDir: string, assetsDir: string): Promise<{ done: string[]; missing: string[] }> {
  const index = libraryIndex(libraryOf(db));
  const videos = path.join(dataDir, 'videos');
  await mkdir(videos, { recursive: true });
  const done: string[] = [];
  const missing: string[] = [];
  for (const m of DEMO_MANIFEST) {
    const row = index.get(m.exercise.trim().toLowerCase());
    if (!row) {
      missing.push(m.exercise);
      continue;
    }
    const copies: Array<[ 'female' | 'male', string ]> = [];
    try {
      for (const [gender, source] of [['female', m.female], ['male', m.male]] as const) {
        const file = `${randomUUID()}.mp4`;
        await copyFile(path.join(assetsDir, m.folder, source), path.join(videos, file));
        copies.push([gender, file]);
      }
    } catch {
      await Promise.all(copies.map(([, f]) => rm(path.join(videos, f), { force: true })));
      missing.push(m.exercise);
      continue;
    }
    for (const [gender, file] of copies) {
      const set = setDemo(db, row.slug, gender, file);
      if (set.ok && set.previous) await rm(path.join(videos, set.previous), { force: true });
    }
    done.push(m.exercise);
  }
  return { done, missing };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dataDir = path.resolve(process.env.DATA_DIR || 'data');
  const db = openDb(path.join(dataDir, 'app.db'));
  const { done, missing } = await seedDemo(db, dataDir, path.resolve('web/assets/exercise-video'));
  console.log(`Загружено: ${done.join(', ') || 'ничего'}`);
  if (missing.length) console.log(`Нет упражнения в библиотеке или файлов: ${missing.join(', ')}`);
}
