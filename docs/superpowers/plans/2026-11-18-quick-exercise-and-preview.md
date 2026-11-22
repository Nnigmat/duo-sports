# Быстрое создание упражнения и превью видео — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** создавать упражнение прямо в окне выбора (редактор тренировки, форма разминки) и видеть превью ролика техники рядом с упражнениями (окна выбора, строки редактора и сборки).

**Architecture:** два новых компонента: `ExerciseThumb` (ui, превью + панель с роликом) и `QuickExerciseForm` (exercises, название + тип). `WorkoutEditView` и `RoutineForm` их встраивают; страницы создают упражнение через `createExercise` и добавляют его в свою копию библиотеки.

**Tech Stack:** React, TypeScript, CSS modules на tokens.css, Radix Dialog (через `Sheet`), vitest, Storybook (`test:stories`).

**Spec:** `docs/superpowers/specs/2026-11-18-quick-exercise-and-preview-design.md`

## Global Constraints

- Тексты по CODING_STANDARDS.md: русский, коротко, без «!»; кнопки не меньше 44 px, настоящие `<button>`; состояние не только цветом; prefers-reduced-motion.
- Цвета и шрифты только из tokens.css; без новых зависимостей.
- Целевой экран a15 (384×832): истории с `globals: { viewport: { value: 'a15', isRotated: false } }`.
- Ролик: `pickDemo(gender, demo)` из `shared/demo.ts`, адрес `/api/demo/<файл>`; пол — вошедшего пользователя (`useAuth()`, `auth.user.gender`).
- Создание: только trainer и admin. Группа мышц у созданного определяется `toExerciseInput` (пустые мышцы → `['Всё тело']`), параметры `DEFAULT_PARAMS`.
- Сборка (`BuilderReviewView`) сохраняет свой `onCreateExercise` (черновик); быстрая форма там не появляется.
- Работа в ветке `feat/quick-exercise-preview`; Conventional Commits; после каждой задачи `npm run build` без ошибок.

## Review Focus

1. Двойное нажатие «Добавить» — один запрос: кнопка `loading`/disabled, пока идёт создание (Task 2).
2. Сервер ответил 409 «Упражнение с таким названием уже есть» или сеть упала — текст ошибки в форме, окно не закрывается, введённое не теряется (Task 2).
3. Файл ролика не грузится (удалён, 404) — превью превращается в заглушку, а не в пустой квадрат (Task 1).
4. Упражнение в строке, которого нет в библиотеке (черновик сборки, старое имя) — заглушка, без падения (Task 3).
5. Название из поиска с пробелами по краям / пустое — обрезается; пустое не отправляется (Task 2).

---

### Task 1: Превью ролика `ExerciseThumb`

**Files:**
- Create: `web/src/ui/ExerciseThumb/ExerciseThumb.tsx`, `ExerciseThumb.module.css`, `ExerciseThumb.stories.tsx`
- Modify: `web/src/ui/index.ts` (экспорт)

**Interfaces:**
- Produces: `ExerciseThumb({ name: string; file?: string })` — `file` это имя файла из `pickDemo`, без префикса.

- [ ] **Step 1:** создать ветку `feat/quick-exercise-preview`, закоммитить спек и этот план (`docs: дизайн и план быстрого создания упражнения`).
- [ ] **Step 2: истории с play-тестами** (`UI/ExerciseThumb`, viewport a15):
  - `WithVideo` (`file` указывает на ролик из существующих историй/фикстур Storybook или любой путь): кнопка с именем `Видео техники: Жим лёжа`; клик открывает панель с заголовком «Жим лёжа» и элементом `video`.
  - `NoVideo` (без `file`): видна подпись «Нет видео»; кнопка той же подписью доступна, клик открывает панель с текстом «Видео техники не добавлено».
  - `BrokenFile` (`file="missing.mp4"`): после события `error` у `video` видна «Нет видео» (`await waitFor(...)`).
- [ ] **Step 3:** `npm run test:stories -- ExerciseThumb` — падают (компонента нет).
- [ ] **Step 4: реализация.** `<button type="button">` 48×48 (CSS-переменная размера из tokens, если есть, иначе 48px), `aria-label="Видео техники: {name}"`. Внутри: при `file` и без ошибки — `<video src="/api/demo/{file}#t=0.1" muted playsInline preload="metadata" aria-hidden>`; иначе иконка `video` и подпись «Нет видео» (caption). `onError` у видео → состояние `broken`. Клик открывает `Sheet` (`title={name}`): ролик `muted loop playsInline autoPlay={!reduced} controls={reduced}` (reduced — `useMediaQuery('(prefers-reduced-motion: reduce)')` из `web/src/shared`), без файла — иконка и «Видео техники не добавлено». Клик не всплывает (`stopPropagation`), чтобы в строке выбора не срабатывал выбор.
- [ ] **Step 5:** `npm run test:stories -- ExerciseThumb`, `npm run lint`, `npm run build` — зелёные.
- [ ] **Step 6:** commit `feat(ui): превью ролика техники ExerciseThumb`.

### Task 2: Форма быстрого создания `QuickExerciseForm`

**Files:**
- Modify: `web/src/features/exercises/library.ts`, `library.test.ts`
- Create: `web/src/features/exercises/QuickExerciseForm/QuickExerciseForm.tsx`, `.module.css`, `.stories.tsx`
- Modify: `web/src/features/exercises/index.ts` (экспорт)

**Interfaces:**
- Produces: `quickDraft(name: string, kind: ExerciseKind): ExerciseDraft` в `library.ts`;
  `QuickExerciseForm({ initialName: string; onCreate: (name: string, kind: ExerciseKind) => Promise<void> })`.
  `onCreate` получает уже обрезанное имя; отказ промиса — `Error` с текстом для показа.

- [ ] **Step 1: тест `quickDraft`** в `library.test.ts`:
  `expect(quickDraft('  Выпады назад ', 'reps')).toEqual({ ...emptyDraft(), name: 'Выпады назад', kind: 'reps' })`;
  `expect(toExerciseInput(quickDraft('Планка', 'time')).muscles).toEqual(['Всё тело'])`.
- [ ] **Step 2:** `npm test -- library` — падает.
- [ ] **Step 3:** реализовать `quickDraft` через `emptyDraft()`.
- [ ] **Step 4:** `npm test -- library` — проходит.
- [ ] **Step 5: истории** (`Features/Exercises/QuickExerciseForm`, a15):
  - `Default` (`initialName: 'Выпады назад'`): поле «Название» = «Выпады назад»; `SegmentedControl` «Тип» с «Вес × повторы», «Повторы», «Время» (по умолчанию «Повторы»); клик «Добавить» вызывает `onCreate('Выпады назад', 'reps')` ровно один раз, даже при двойном клике (onCreate — промис, который не завершается).
  - `Trimmed`: ввести «  Планка  », выбрать «Время» → `onCreate('Планка', 'time')`.
  - `Empty`: очистить поле → «Добавить» disabled.
  - `Failed`: `onCreate` отклоняется `new Error('Упражнение с таким названием уже есть')` → текст виден (`Notice tone="error"`), поле сохранило значение, кнопка снова доступна.
- [ ] **Step 6:** реализация. Заголовок «Добавить упражнение» (eyebrow), `TextInput label="Название"` maxLength 200, `SegmentedControl label="Тип"`, `Button icon="plus" loading={busy}` «Добавить». Обёрнуто в `<form onSubmit>`, чтобы Enter тоже добавлял.
- [ ] **Step 7:** `npm run test:stories -- QuickExerciseForm`, lint, build — зелёные.
- [ ] **Step 8:** commit `feat(exercises): форма быстрого создания упражнения`.

### Task 3: Редактор тренировки — превью и быстрая форма в окне выбора

**Files:**
- Modify: `web/src/features/trainer/WorkoutEditPage/WorkoutEditView.tsx`, `.module.css`, `.stories.tsx`
- Modify: `web/src/features/builder/BuilderReviewView/BuilderReviewView.tsx` (+ его страница, если пол надо пробросить)

**Interfaces:**
- Consumes: `ExerciseThumb`, `QuickExerciseForm`, `pickDemo`.
- Produces: новые пропсы `WorkoutEditView`:
  `gender?: Gender` — для превью;
  `onQuickCreate?: (blockId: string, name: string, kind: ExerciseKind) => Promise<void>` — есть — в окне выбора при пустом результате быстрая форма; приоритет над `onCreateExercise`.

- [ ] **Step 1: истории** в `WorkoutEditView.stories.tsx`:
  - В `library` фикстуры добавить `demo: { female: 'bench.mp4' }` для «Жим лёжа».
  - `Thumbs`: у строки «Жим лёжа» кнопка `Видео техники: Жим лёжа`; у «Жим узкий» (нет в библиотеке) — подпись «Нет видео».
  - `PickerThumbs`: «Добавить упражнение» → в окне у каждой строки есть кнопка `Видео техники: …`; клик по ней не добавляет упражнение (`onBlocks` не вызван); клик по названию — добавляет.
  - `QuickCreate`: с `onQuickCreate: fn(async () => {})` ввести «Выпады назад» в поиск → видна форма с этим названием; «Добавить» → `onQuickCreate('b1', 'Выпады назад', 'reps')`, окно закрылось.
  - `QuickCreateFails`: `onQuickCreate` отклоняется → ошибка видна, окно открыто.
  - `NoQuickCreate` (ни `onQuickCreate`, ни `onCreateExercise`): прежний текст «Ничего не нашлось…».
- [ ] **Step 2:** `npm run test:stories -- WorkoutEditView` — новые падают.
- [ ] **Step 3: реализация.**
  - `PickerSheet`: строка `<li>` = `ExerciseThumb` + существующая кнопка выбора. Пропс `onQuickCreate?: (name, kind) => Promise<void>`; при пустом результате и непустом запросе рендерит `<QuickExerciseForm key={q.trim()} initialName={q.trim()} onCreate=…>`; после успеха сбросить `q`. Иначе — ветка `onCreate` как сейчас, иначе текст.
  - `WorkoutEditView`: `onQuickCreate` оборачивает в `async (name, kind) => { await onQuickCreate(pickFor, name, kind); setPickFor(null); }`.
  - `ExerciseRow`: новый проп `demoFile?: string`; `ExerciseThumb` первым в `exerciseHead`. В родителе: `pickDemo(gender, library.find((l) => l.name === e.name)?.demo)`.
- [ ] **Step 4:** `BuilderReviewView` — передать `gender` из `useAuth()` (`auth.status === 'in' ? auth.user.gender : undefined`), `onCreateExercise` не трогать.
- [ ] **Step 5:** `npm run test:stories -- WorkoutEditView BuilderReview`, lint, build — зелёные.
- [ ] **Step 6:** commit `feat(trainer): превью видео и быстрое создание в редакторе тренировки`.

### Task 4: Страница редактора — создание через сервер

**Files:**
- Create: `shared/roles.ts`, `shared/roles.test.ts`
- Modify: `server/imports.ts` (брать `canAddExercises` из `shared/roles.ts` и реэкспортировать — импорты сервера не меняются)
- Modify: `web/src/features/trainer/WorkoutEditPage/WorkoutEditPage.tsx`

**Interfaces:**
- Consumes: `createExercise(draft: ExerciseDraft): Promise<LibraryExercise>` (`features/exercises/api.ts`), `quickDraft`, `addExercise(blocks, blockId, pick)` (`draft.ts`), `onQuickCreate` из Task 3.
- Produces: `canAddExercises(role: Role): boolean` в `shared/roles.ts`.

- [ ] **Step 1: тест** `shared/roles.test.ts`: `athlete` → false, `trainer` → true, `admin` → true.
- [ ] **Step 2:** `npm test -- roles` падает → перенести функцию → проходит. Серверные тесты (`npm test`) зелёные.
- [ ] **Step 3:** в `Editor` держать `const [lib, setLib] = useState(library)`, передавать `lib` везде вместо `library` (включая YAML-функции). `onQuickCreate` передавать, только если `canAddExercises(role)`:
  `async (blockId, name, kind) => { const ex = await createExercise(quickDraft(name, kind)); setLib((l) => [...l, ex]); setBlocks((b) => addExercise(b, blockId, ex)); }`. Ошибка сети/409 пробрасывается — её показывает форма. `gender` — из `useAuth()`.
- [ ] **Step 4:** `npm run build`, `npm run lint`, `npm test`. Ручная проверка через навык `run`: `trainer/athletes/:id/workouts/:wid/edit` — найти несуществующее, создать, упражнение в блоке; повторить то же имя — ошибка «уже есть»; `plan/workouts/:wid/edit` под спортсменом — формы нет.
- [ ] **Step 5:** commit `feat(trainer): быстрое создание упражнения в редакторе тренировки`.

### Task 5: Форма разминки — превью и быстрое создание

**Files:**
- Modify: `web/src/features/routines/RoutineForm/RoutineForm.tsx`, `.module.css`, `RoutineForm.stories.tsx` (если есть; иначе создать историю окна выбора)
- Modify: `web/src/features/routines/RoutinesPage/RoutinesPage.tsx`

**Interfaces:**
- Consumes: `ExerciseThumb`, `QuickExerciseForm`, `pickDemo`, `createExercise`, `quickDraft`, `canAddExercises`.
- Produces: `PickerExercise = { id: string; name: string; kind: ExerciseKind; demo?: ExerciseDemo }`; новые пропсы `RoutineForm`: `gender?: Gender`, `onQuickCreate?: (name: string, kind: ExerciseKind) => Promise<PickerExercise>`.

- [ ] **Step 1: истории:** окно «Добавить из библиотеки» — у строк кнопки `Видео техники: …`, клик по превью не добавляет; поиск без результата + `onQuickCreate` → форма; «Добавить» → упражнение появилось в списке разминки, окно закрыто; отказ → ошибка, окно открыто; без `onQuickCreate` — прежнее «Ничего не нашлось.».
- [ ] **Step 2:** прогнать — новые падают.
- [ ] **Step 3: реализация.** `RoutineForm` держит `extra: PickerExercise[]` (созданные в этой сессии) и ищет по `[...exercises, ...extra]` (поиск и `draftFromYaml`). После `onQuickCreate`: добавить в `extra`, `patch({ items: [...draft.items, newItem(ex.id, ex.name)] })`, закрыть окно, сбросить запрос. `RoutinesPage.WithExercises` пробрасывает `demo`; страница передаёт `gender` и, если `canAddExercises(role)`, `onQuickCreate = async (n, k) => { const e = await createExercise(quickDraft(n, k)); return { id: e.id, name: e.name, kind: e.kind }; }`.
- [ ] **Step 4:** `npm run test:stories -- RoutineForm`, lint, build, test — зелёные.
- [ ] **Step 5:** commit `feat(routines): превью видео и быстрое создание в форме разминки`.

### Task 6: Финальная проверка и PR

- [ ] **Step 1:** `npm run lint && npm test && npm run build && npm run test:stories` — всё зелёное (как в ci.yml).
- [ ] **Step 2:** проверить вёрстку окна выбора и строк в a15 (Storybook или навык `run`): превью не сжимает название, кнопки ≥ 44 px.
- [ ] **Step 3:** push ветки, PR с текстом через `/mattpocock-skills:pr`.
