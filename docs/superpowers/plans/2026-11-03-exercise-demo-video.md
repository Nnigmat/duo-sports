# Видео чибика к упражнению: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** У каждого упражнения два ролика с чибиком (девочка, мальчик); на экране тренировки вместо статичного чибика играет ролик по полу спортсмена.

**Architecture:** Два столбца в `exercises` хранят имена файлов в `data/videos`. Тренер и админ грузят и удаляют ролики через `PUT/DELETE /api/exercises/:id/demo/:gender`; читает любой вошедший через `GET /api/demo/:file`. Сервер при отдаче тренировки сам выбирает ролик по полу `req.user` чистой функцией `pickDemo` и кладёт один `demoUrl` в `Technique`; клиент пол не знает. Текстовая ссылка `video` удаляется целиком.

**Tech Stack:** Express 5, better-sqlite3, React 19, vitest (проект `unit`), Storybook. Новых зависимостей нет.

**Spec:** решения согласованы в чате 2026-11-03 (отдельного файла нет); ниже они сведены в Global Constraints.

## Global Constraints

- Значения пола: `'female' | 'male'`; без пола — `null` в базе, `undefined` в типах. Подписи в интерфейсе: «Девочка», «Мальчик».
- Ролик: `video/mp4` или `video/webm`, не больше 50 МБ (`MAX_DEMO_BYTES = 50 * 1024 * 1024`), хранится в `data/videos/<uuid>.<ext>`, в базе только имя файла.
- Выбор ролика: ролик под пол спортсмена, иначе любой имеющийся, иначе ничего.
- Ролик на экране тренировки: без звука, зациклен, автозапуск, `playsInline`. Показывается только в фазе работы и только на шаге без записи (на шаге записи чибик держит камеру). На отдыхе, на финише, без ролика и при `prefers-reduced-motion: reduce` остаётся статичный чибик. Если файл не загрузился (`onError`), тоже чибик.
- Ссылка `video` (поле упражнения, `Technique.videoUrl`, вкладка «Видео» в `TechSheet`) убирается. Столбец `video_url` в базе не трогаем.
- Писать ролики могут только `trainer` и `admin` (`canAddExercises(role)`), смотреть любой вошедший.
- Интерфейс на русском, без восклицательных знаков и эмодзи; кнопки не меньше 44 px; только токены из `tokens.css`; новых зависимостей нет.
- После каждой задачи `npm run build` и `npm test` без ошибок.

## Review Focus

- Спортсмен без пола: ролик другого пола, а не пустой экран.
- Файл ролика пропал с диска или упал по сети: на экране чибик, не чёрный прямоугольник.
- Замена и удаление ролика, удаление упражнения: старый файл удаляется с диска.
- Имя файла в `GET /api/demo/:file` с `..` или чужим расширением: 404, наружу из `data/videos` не выходим.
- Загрузка не того типа (415), пустого файла (400), слишком большого (413): в базе ничего не меняется, недописанный файл удалён.

---

### Task 1: Пол спортсмена

**Files:**
- Modify: `server/db.ts` (миграция в `migrate`, `users.gender`), `server/auth.ts` (`createUser`, `userBySession`/`login` отдают `gender`), `server/createUser.ts`, `shared/types.ts` (`AuthUser`)
- Create: `server/setGender.ts`; `package.json` скрипт `set-gender`
- Test: `server/auth.test.ts`

**Interfaces:**
- Produces: `export type Gender = 'female' | 'male'` в `shared/types.ts`; `AuthUser.gender?: Gender`; `createUser(db, email, password, role, gender?: Gender)`; `setGender(db, email, gender | null)` в `server/auth.ts`.

- [ ] **Step 1: Failing tests** в `server/auth.test.ts`: `createUser(..., 'athlete', 'female')` → `userBySession(...).gender === 'female'`; без пола → `gender` отсутствует в ответе (`toBeUndefined()`); `setGender(db, email, 'male')` меняет, `setGender(db, email, null)` очищает; пол вне двух значений отвергается (`throws`).
- [ ] **Step 2:** `npx vitest run --project unit server/auth.test.ts` — падают.
- [ ] **Step 3:** Миграция `ALTER TABLE users ADD COLUMN gender TEXT CHECK (gender IN ('female','male'))` по образцу `goal`. Реализовать функции выше; в `createUser.ts` четвёртый аргумент `[female|male]`, в `setGender.ts` — `npm run set-gender -- <email> <female|male|none>`; подсказку использования обновить.
- [ ] **Step 4:** Тесты проходят, `npm run build` чистый.
- [ ] **Step 5: Commit** `Пол спортсмена: поле gender у пользователя, аргумент create-user, set-gender`

### Task 2: Выбор ролика по полу

**Files:**
- Create: `shared/demo.ts`, `shared/demo.test.ts`
- Modify: `shared/types.ts` (`ExerciseDemo`)

**Interfaces:**
- Produces: `export interface ExerciseDemo { female?: string; male?: string }` (значения — имена файлов); `export function pickDemo(gender: Gender | undefined, demo: ExerciseDemo | undefined): string | undefined`.

- [ ] **Step 1: Failing tests** (`shared/demo.test.ts`): девочка при обоих → `female`; мальчик при обоих → `male`; пол без своего ролика → чужой; без пола при обоих → `female` (детерминированно); `demo` пустой или `undefined` → `undefined`.
- [ ] **Step 2–4:** убедиться, что падает; реализовать; проходит. Проверить, что `vitest.config.ts` подхватывает `shared/**/*.test.ts`, иначе добавить.
- [ ] **Step 5: Commit** `pickDemo: ролик по полу спортсмена с запасным вариантом`

### Task 3: Хранение роликов в библиотеке, удаление ссылки

**Files:**
- Modify: `server/db.ts` (столбцы `demo_female`, `demo_male` в схеме `exercises` и в `migrate`), `server/exercises.ts`, `server/imports.ts`, `server/comments.ts` (`techniqueOf`, `techniquesFor`, `LibraryRow`), `shared/types.ts` (`LibraryEntry`, `ExerciseInput`, `CommitExercise`, `Technique`), `server/defaultExercises.ts` при необходимости
- Test: `server/exercises.test.ts`, `server/exercisesWrite.test.ts`, `server/imports.test.ts`, `server/comments.test.ts`

**Interfaces:**
- Produces: `LibraryEntry.demo?: ExerciseDemo` (без `video`); `Technique.demoUrl?: string` (без `videoUrl`); `LibraryRow.demo: ExerciseDemo`; в `server/exercises.ts`: `setDemo(db, slug, gender: Gender, file: string | null): { ok: true; previous?: string } | { ok: false }` — возвращает прежнее имя файла, чтобы вызывающий удалил его с диска; `deleteExercise` возвращает удалённые имена файлов (изменить сигнатуру: `string[] | null`, `null` — не найдено).
- Consumes: `ExerciseDemo` из Task 2.

- [ ] **Step 1: Failing tests:** `libraryOf` отдаёт `demo: { female: 'a.mp4' }` при заполненном `demo_female`; `setDemo` меняет и возвращает прежний файл; `setDemo(..., null)` очищает; `validateFields` больше не принимает `video` (поле игнорируется, не ошибка); импорт файла с ключом `video` не падает; `techniquesFor` больше не отдаёт `videoUrl`.
- [ ] **Step 2:** Прогнать, падают.
- [ ] **Step 3:** Реализовать; убрать `video` из валидации, `createExercise`, `updateExercise`, импорта. `video_url` остаётся в схеме, но не читается и не пишется; `migrateSharedExercises` оценивает «заполненность» по `video_url` — оставить как есть.
- [ ] **Step 4:** `npm test` и `npm run build`. Сборка укажет места во веб-коде, где ещё есть `video` (`web/src/features/exercises/*`, `web/src/data/fixtures.ts`, импорт) — на этом шаге удалить только то, что ломает типы, форму и экран доделает Task 6.
- [ ] **Step 5: Commit** `Библиотека: два ролика чибика на упражнение вместо ссылки`

### Task 4: Загрузка и раздача роликов

**Files:**
- Modify: `server/videos.ts` (вынести потоковую запись в `saveUpload`), `server/exercisesRouter.ts`, `server/index.ts`
- Create: `server/demoRouter.ts` (`GET /demo/:file`), если не помещается в `exercisesRouter.ts`
- Test: `server/demoRouter.test.ts`, `server/videos.test.ts` (регрессия)

**Interfaces:**
- Produces: `export async function saveUpload(req, dir, maxBytes): Promise<{ ok: true; file: string; ext: string } | { ok: false; status: 400 | 413 | 415; error: string }>` — потоковая запись из `POST /videos`, возвращает имя `<uuid>.<ext>`, при любой ошибке удаляет недописанный файл; `POST /videos` переписать поверх неё, поведение и тесты без изменений. Маршруты: `PUT /api/exercises/:id/demo/:gender` (тело — файл, ответ `200` с `LibraryEntry`), `DELETE /api/exercises/:id/demo/:gender` (`200` с `LibraryEntry`, `404` если упражнения нет), `GET /api/demo/:file` (с Range, `Cache-Control: private, max-age=3600` только на успехе).
- Consumes: `setDemo`, `canAddExercises`.

- [ ] **Step 1: Failing tests** (supertest-подход как в `videos.test.ts`): `PUT` от тренера записывает файл и поле, ответ содержит `demo.female`; `PUT` от спортсмена — 403; неверный `:gender` — 400; `PUT` с `text/plain` — 415; пустое тело — 400; тело больше лимита — 413, файла на диске нет, поле не изменилось; повторный `PUT` удаляет старый файл с диска; `DELETE` очищает поле и файл; `GET /demo/:file` — 200 любому вошедшему, 401 без сессии, 404 для `../x`, для `x.exe`, для несуществующего файла; Range отдаётся (206).
- [ ] **Step 2:** Падают.
- [ ] **Step 3:** Реализовать. `:file` проверять регэкспом `^[0-9a-f-]{36}\.(mp4|webm)$` до обращения к диску. Удаление файла при `deleteExercise` — тоже здесь (роутер удаляет вернувшиеся имена). Лимит `MAX_DEMO_BYTES` в `server/index.ts`.
- [ ] **Step 4:** `npm test`, `npm run build`.
- [ ] **Step 5: Commit** `Ролики чибика: загрузка и удаление тренером, раздача с Range`

### Task 5: Ролик по полу в ответе тренировки

**Files:**
- Modify: `server/comments.ts` (`techniquesFor(blocks, library, gender?)`), `server/workouts.ts`, `server/workoutRouter.ts`, `web/src/features/workout/sheets/TechSheet/TechSheet.tsx` (+ css, stories), `web/src/features/workout/flow/technique.ts` (+ test)
- Test: `server/comments.test.ts`, `server/workouts.test.ts`, `web/src/features/workout/flow/technique.test.ts`

**Interfaces:**
- Produces: `Technique.demoUrl` = `/api/demo/<file>` из `pickDemo(gender, lib.demo)`; упражнение, у которого есть только ролик без шагов и ошибки, всё равно попадает в `techniques` (иначе экран не получит ролик). `hasTechnique(technique)` в `technique.ts` остаётся про текст: ролик не считается содержанием панели.
- Consumes: `pickDemo`, `AuthUser.gender`.

- [ ] **Step 1: Failing tests:** `techniquesFor(blocks, lib, 'male')` отдаёт мужской ролик, `'female'` — женский, `undefined` — женский при обоих; упражнение с одним роликом и без заметок присутствует в результате; `GET /api/workouts/:id` для спортсмена с полем `gender = 'male'` возвращает мужской `demoUrl`; `hasTechnique({ instructions: [], demoUrl: '/api/demo/x.mp4' })` — `false`.
- [ ] **Step 2–4:** падают; реализовать; убрать из `TechSheet` вкладку «Видео» и переключатель формата, оставив анимацию; обновить stories и CSS, удалить неиспользуемый `.video`; тесты и сборка.
- [ ] **Step 5: Commit** `Тренировка отдаёт ролик по полу спортсмена, из «Техники» убрана вкладка «Видео»`

### Task 6: Загрузка в форме упражнения

**Files:**
- Create: `web/src/features/exercises/ExerciseForm/DemoSlot/DemoSlot.tsx`, `DemoSlot.module.css`, `DemoSlot.stories.tsx`
- Modify: `web/src/features/exercises/ExerciseForm/ExerciseFormScreen.tsx` (заглушка → два слота), `ExerciseForm.tsx` (убрать поле ссылки), `web/src/features/exercises/library.ts` (убрать `isVideoUrl`, `videoError`, `video` из `ExerciseDraft`/`toExerciseInput`/`draftFromExercise`), `types.ts`, `api.ts`, `ExerciseDetailView.tsx` (убрать кнопку ссылки; блок «Добавить видео» вести на форму редактирования), `web/src/data/api.ts`, `web/src/data/hooks.ts`, `mock.ts`, `fixtures.ts`
- Test: `web/src/features/exercises/library.test.ts`, `web/src/features/exercises/api.test.ts`

**Interfaces:**
- Produces: `uploadDemo(exerciseId: string, gender: Gender, file: File): Promise<LibraryEntry>` и `deleteDemo(exerciseId: string, gender: Gender): Promise<LibraryEntry>` в `web/src/data/api.ts`; `LibraryExercise.demo?: ExerciseDemo`; компонент `DemoSlot` с пропсами `{ label: 'Девочка' | 'Мальчик'; src?: string; busy?: boolean; error?: string; onPick: (file: File) => void; onRemove: () => void }`.
- Consumes: маршруты Task 4.

- [ ] **Step 1: Failing tests:** `toExerciseInput` не содержит `video`; `draftFromExercise` без `video`; `api.ts` маппит `demo` из `LibraryEntry` в `LibraryExercise`.
- [ ] **Step 2–3:** падают; реализовать. Слот: превью `<video muted loop playsInline autoPlay>` (при `prefers-reduced-motion` без автозапуска), `<input type="file" accept="video/mp4,video/webm">` с настоящим `<label>` и кнопка «Заменить»/«Удалить»; пока файл уходит — `busy`, при отказе — `Notice` с текстом сервера. Загрузка слотов доступна только в режиме редактирования (у нового упражнения id ещё нет): в режиме создания слоты неактивны с подписью «Видео можно добавить после создания упражнения». Ролик грузится сразу по выбору файла, отдельно от кнопки «Сохранить».
- [ ] **Step 4:** `npm test`, `npm run build`, в Storybook проверить слот в состояниях: пусто, с роликом, загрузка, ошибка.
- [ ] **Step 5: Commit** `Форма упражнения: загрузка роликов для девочки и мальчика`

### Task 7: Ролик вместо чибика на экране тренировки

**Files:**
- Create: `web/src/features/workout/parts/DemoVideo/DemoVideo.tsx`, `DemoVideo.module.css`, `DemoVideo.stories.tsx`; `web/src/features/workout/flow/demo.ts`, `demo.test.ts`
- Modify: `web/src/features/workout/TrainingScreen/TrainingScreen.tsx` (+ css, stories), `web/src/features/workout/WorkoutFlow/WorkoutFlow.tsx`

**Interfaces:**
- Produces: `export function demoFor(args: { phase: 'work' | 'rest'; record: boolean; demoUrl?: string }): string | undefined` — возвращает `demoUrl` только в фазе `work` на шаге без записи; `TrainingScreen` получает необязательный проп `demoUrl?: string`; `DemoVideo` с пропсами `{ src: string; onFail: () => void }`.
- Consumes: `Technique.demoUrl`.

- [ ] **Step 1: Failing tests** `demo.test.ts`: работа без записи → url; отдых → `undefined`; работа с записью → `undefined`; без url → `undefined`.
- [ ] **Step 2–3:** падают; реализовать. `TrainingScreen`: при `demoUrl` и без `prefers-reduced-motion` и без ошибки загрузки вместо `.disc` + `<Chibi>` рисуется `DemoVideo` (атрибуты по Global Constraints, `aria-hidden` — ролик декоративный, смысл несёт облачко). Состояние «упал» держит `TrainingScreen` и сбрасывает при смене `demoUrl`. Хук для `prefers-reduced-motion` взять из `web/src/shared` или `ui`, если он уже есть, иначе написать рядом. `WorkoutFlow` считает `demoFor(...)` из `techniques[shown.exerciseId]`. Файлы исходников 16:9 (1280×720): ролик занимает ширину сцены за вычетом боковых кнопок, скруглён токеном `--rounded-*`, фон поверх `--surface`; на низком экране уменьшается по высоте, как чибик. Подобрать размеры в Storybook на ширине 375 px.
- [ ] **Step 4:** `npm test`, `npm run build`; в Storybook три сцены: ролик, чибик на отдыхе, чибик при ошибке.
- [ ] **Step 5: Commit** `Экран тренировки: ролик чибика вместо статичного, с запасным чибиком`

### Task 8: Загрузка готовых файлов из web/assets/exercise-video

**Files:**
- Create: `server/seedDemo.ts`, `server/seedDemo.test.ts`; `package.json` скрипт `seed-demo`

**Interfaces:**
- Produces: `export const DEMO_MANIFEST: Array<{ folder: string; female: string; male: string }>` (имена файлов без пути); `export async function seedDemo(db, dataDir, assetsDir): Promise<{ done: string[]; missing: string[] }>` — упражнение ищется по названию через тот же индекс, что и `techniquesFor` (`libraryIndex`, `key`), файлы копируются в `data/videos/<uuid>.mp4`, поля ставятся через `setDemo`; ненайденные упражнения попадают в `missing`, ничего не создаётся.
- Манифест (папка → девочка / мальчик), пол определён по кадрам:

| Папка | Девочка | Мальчик |
|---|---|---|
| Отжимания с касанием предмета | `gemini_generated_video_ef3ee9ac.mp4` | `gemini_generated_video_4c7f5e40.mp4` |
| Отжимание от скамьи | `gemini_generated_video_ac461cfd.mp4` | `gemini_generated_video_ee69dfb5.mp4` |
| Подтягивание колен | `gemini_generated_video_12bd6f91.mp4` | `gemini_generated_video_8697860e.mp4` |
| Выпады | `gemini_generated_video_2eb39207.mp4` | `gemini_generated_video_e4cc22c4.mp4` |
| Ножницы | `gemini_generated_video_4de3b527.mp4` | `gemini_generated_video_daa559e8.mp4` |
| Лодочка | `gemini_generated_video_e4e25f36.mp4` | `gemini_generated_video_633cc195.mp4` |

- [ ] **Step 1: Failing tests** на временной базе и временных папках: два файла копируются, поля заполнены, исходники на месте; упражнения нет в библиотеке → в `missing`, файлы не копируются; повторный запуск заменяет ролик и удаляет прежний файл, дублей на диске нет.
- [ ] **Step 2–4:** падают; реализовать; `npm test`, `npm run build`.
- [ ] **Step 5:** Запустить `npm run seed-demo`, показать пользователю списки `done` и `missing` (в библиотеке по умолчанию есть только «Выпады с гантелями», остальным упражнениям нужны одноимённые записи, это решает пользователь). Commit `Скрипт seed-demo: ролики из web/assets/exercise-video в библиотеку`.

---

## Self-Review

- **Покрытие:** пол (1), выбор (2), хранение и удаление ссылки (3), загрузка и раздача (4), серверный выбор в тренировке и «Техника» (5), форма (6), экран (7), готовые файлы (8). Просмотр пола тренером в карточке ученика из согласованного описания сюда не вошёл: админ меняет пол через CLI, тренеру пол не показывается; это отдельная небольшая задача.
- **Типы:** `Gender`, `ExerciseDemo`, `pickDemo`, `setDemo`, `demoUrl`, `demoFor` везде одинаково.
- **Пропорция:** задачи описывают сигнатуры и проверки, тела функций не расписаны.
