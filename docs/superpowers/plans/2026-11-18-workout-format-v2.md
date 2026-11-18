# Формат тренировки v2 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сборка тренировки агентом перестаёт отбрасывать тренировку из-за естественных записей тренера: формат v2 с одним способом записи, новые возможности модели и экрана (заметки, отдых у упражнения и после круга, время на максимум, шаг-заметка, любое упражнение в разминке) и черновик с пометками вместо отказа.

**Architecture:** Модель тренировки (`shared/types.ts`, JSON в `workouts.structure`) получает необязательные поля, поэтому старые тренировки идут как раньше. `parseImport` ветвится по `version`: v1 идёт по нынешнему коду, v2 читается своими функциями чтения упражнения, блока и позиции набора, а поиск в библиотеке, наборы, план и предпросмотр общие. Схема агента — JSON-вид YAML v2; после повтора с ошибками чистая функция по путям ошибок чинит ответ и помечает поля, и черновик открывается всегда.

**Tech Stack:** Express 5, better-sqlite3 (чистый SQL), React 19, `yaml`, vitest, Storybook, Biome. Новых зависимостей нет.

**Spec:** `docs/superpowers/specs/2026-11-18-workout-format-v2-design.md`

## Global Constraints

- v1 разбирается ровно как сейчас: существующие тесты `web/src/features/import/*.test.ts` и `workoutYaml.test.ts` не правятся, кроме случаев, которые спек явно расширяет (упражнение не на время в наборе — теперь не ошибка).
- Новые поля модели необязательные; миграция структуры не нужна. Колонки — `ALTER TABLE … ADD COLUMN` в `migrate()` в `server/db.ts`, идемпотентно через `columns(...)`.
- Схема агента: не больше 24 необязательных полей и 16 union на запрос, у объекта не больше 3 необязательных, `minItems` > 1 нельзя. Счёт держит тест в `shared/aiDraft.test.ts`.
- После правки схемы — `npm run smoke:ai` (настоящий запрос, стоит денег): исполнитель спрашивает пользователя перед запуском.
- Замер фикстуры против API делает пользователь вручную; в плане его нет.
- Тексты интерфейса: русский, без «!» и эмодзи; «90 с», «60 кг × 10», мм:сс; tabular-nums. Кнопки ≥ 44 px; состояние не только цветом. Новые экраны — истории в окне `a15`.
- Логика разбора и сценария — чистые функции с тестами vitest; каждая запись из таблицы «Фикстура» спека — отдельный тест.
- После каждой задачи `npm run build` без ошибок типов и `npm run lint` чистый (исключения только `biome-ignore` с причиной).
- Коммиты — Conventional Commits 1.0.0, в конце `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Текст PR — через `/mattpocock-skills:pr`.
- Три PR, каждый из своей ветки от main; перед PR `npm run lint && npm test && npm run build && npm run test:stories`. В main не пушить.
- Перед началом: в рабочем дереве незавершённое слияние (`UU web/src/features/workout/StartScreen/StartScreen.tsx`) и чужие правки `server/ai*.ts` на ветке `fix/ai-builder-sides-latency`. Их разрешает пользователь; работа начинается с чистой ветки от main.

## Review Focus

- Старый круг (без `restAfter`) после обновления идёт как раньше — отдых после каждого упражнения (Task 2, тест `circuit without restAfter rests after every exercise`).
- Секундомер на максимум и перезагрузка страницы: после перезагрузки шаг снова ждёт «Старт», а не продолжает и не засчитывает 0 с (Task 3, тест `afterReload resets stopwatch`).
- YAML v2 с полем v1 (`do`, `rest`, `per_side`, `name`) даёт ошибку с подсказкой поля v2, а не «Незнакомое поле» и не молчаливый пропуск (Task 7, тест `v1 field in v2 names the v2 field`).
- Ответ агента со своей разминкой и ошибкой в блоке основной части: ремонт попадает в нужный блок, хотя в документе импорта перед ним стоит блок-ссылка разминки (Task 13, тест `repair maps yaml path with warmup present`).
- Ответ агента с одним неверным полем после повтора: черновик открыт, упражнение на месте с пометкой, «Сохранить» недоступна до правки (Task 13 и Task 14, тесты `repairs bad load into mark`, `save disabled while marks remain`).
- Тренировка с шагом-заметкой проходит экран, финиш и разбор, а статистика финиша и прогресс не считают заметку подходом (Task 5, тест `note step is not a set in finish stats`).

---

## PR 1 — модель и экран тренировки (ветка `feat/workout-model-v2`)

Первый коммит ветки — спек и этот план: `docs(workout): дизайн и план формата тренировки v2`.

### Task 1: Поля модели, проверка на сервере, заметка тренировки

**Files:**
- Modify: `shared/types.ts` (Exercise, SetsExercise, CircuitBlock, Block, Workout, CommitWorkout)
- Modify: `server/imports.ts:92-130` (`MODES`, `checkExercise`, `checkStructure`), вставка тренировки (`insertWorkout`)
- Modify: `server/db.ts` (`migrate`: `workouts.notes`)
- Modify: `server/workouts.ts:11` (`workoutOf`), `server/workoutEdit.ts:22` (`updateWorkout`)
- Test: `server/imports.test.ts`, `server/workouts.test.ts`, `server/workoutEdit.test.ts`

**Interfaces:**
- Produces:
  - `Exercise.note?: string`; `Exercise.sides?: [string, string]` теперь допустимо в любом блоке
  - `SetsExercise.restSec?: number`
  - `CircuitBlock.restAfter?: 'round'`
  - `interface NoteBlock { id: string; mode: 'note'; title: string; text: string }`; `Block = TimedBlock | SetsBlock | CircuitBlock | NoteBlock`
  - `Workout.notes?: string`; `CommitWorkout.notes?: string`; тело `updateWorkout` принимает `notes?: string` (пустая строка очищает)
  - `checkStructure(blocks: unknown): boolean` принимает всё перечисленное; `note` и `text` — до `LIMITS.text` (1000), `title` — до `LIMITS.name`

- [ ] **Step 1: Тесты `checkStructure`** — `accepts exercise note`, `accepts sides in sets block`, `accepts exercise restSec 0..3600`, `rejects exercise restSec 3601`, `accepts circuit restAfter round`, `rejects restAfter other`, `accepts note block without exercises`, `rejects note block with text over 1000`.
- [ ] **Step 2: Тесты заметки тренировки** — `applyImport stores workout notes` (коммит с `notes: 'Рабочих подходов отжиманий сегодня нет'` → `workoutOf(...).notes` равно этой строке); `updateWorkout clears notes with empty string` (→ `notes` нет в ответе).
- [ ] **Step 3: `npm test -- server/imports server/workouts server/workoutEdit`** — новые тесты падают.
- [ ] **Step 4: Типы, миграция `ALTER TABLE workouts ADD COLUMN notes TEXT`, проверка и запись.** `MODES` += `'note'`; у блока `note` не проверять `exercises`. TypeScript покажет все места, где переключение по `block.mode` не знает `note`. В этой задаче везде, включая экран, блок `note` — пустое действие: `draftsOf` возвращает `[]`, сводка, редактор, разбор, план и достижения его пропускают. Task 5 заменит пустое действие на экране настоящим шагом. Сборка после задачи чистая.
- [ ] **Step 5: Тесты проходят, `npm run build` без ошибок.**
- [ ] **Step 6: Commit** — `feat(workout): заметки, отдых у упражнения и блок-заметка в модели`

### Task 2: Отдых у упражнения подходов и после круга

**Files:**
- Modify: `web/src/features/workout/flow/buildSteps.ts:73-90` (`buildSteps`)
- Modify: `web/src/features/workout/flow/summary.ts:46` (`restLabel`)
- Test: `web/src/features/workout/flow/buildSteps.test.ts`, `summary.test.ts`

**Interfaces:**
- Consumes: Task 1 (`SetsExercise.restSec`, `CircuitBlock.restAfter`)
- Produces: `Step.restAfterSec` с новыми правилами; `restLabel(block: Block): string | undefined`

- [ ] **Step 1: Тесты** —
  - `sets exercise restSec overrides block`: блок `restSec: 90`, упражнения A (`sets: 2, restSec: 180`), B (`sets: 2`) → `restAfterSec` шагов `[180, 180, 90, 0]`;
  - `circuit restAfter round rests only after last exercise`: 2 круга × 3 упражнения, `restSec: 90` → `[0, 0, 90, 0, 0, 0]`;
  - `circuit without restAfter rests after every exercise` (старые данные): те же входные без `restAfter` → `[90, 90, 90, 90, 90, 0]`;
  - `restLabel`: круг с `restAfter` → `'Отдых 90 с после круга'`; подходы с разным отдыхом → `'Отдых у упражнений'`; подходы с одинаковым → `'Отдых 90 с между подходами'` (как сейчас).
- [ ] **Step 2: Тесты падают.**
- [ ] **Step 3: Реализация.** Отдых перед заминкой после последнего шага — как сейчас.
- [ ] **Step 4: Тесты проходят.**
- [ ] **Step 5: Commit** — `feat(workout): отдых у упражнения в подходах и после круга`

### Task 3: Время на максимум — секундомер

**Files:**
- Modify: `web/src/features/workout/flow/format.ts:20-45` (`formatTarget`, `formatPlan`, `timerSeconds`)
- Modify: `web/src/features/workout/flow/session.ts` (`afterReload`, состояние начала секундомера)
- Create: `web/src/features/workout/flow/stopwatch.ts` (чистые функции вида секундомера)
- Modify: `web/src/features/workout/WorkoutFlow/WorkoutFlow.tsx:363-440` (новый `StopwatchStage`)
- Modify: `web/src/features/workout/sheets/ResultSheet/ResultSheet.tsx` (начальное значение времени)
- Test: `format.test.ts`, `session.test.ts`, `stopwatch.test.ts`, история `WorkoutFlow.stories.tsx`

**Interfaces:**
- Consumes: время на максимум — `kind: 'time'`, `target: { min: 0, max: 0 }`
- Produces: `isOpenTime(plan: SetPlan): boolean`; `stopwatchView(elapsedSec: number): { label: string }` (мм:сс); `ResultSheet` проп `initialSec?: number`

- [ ] **Step 1: Тесты** — `formatTarget('time', {min:0,max:0})` → `'макс.'`; `formatPlan('time', {target:{min:0,max:0}})` → `'макс.'`; `isOpenTime` true только для `{0,0}` у time; `stopwatchView(75).label` → `'1:15'`; `afterReload resets stopwatch` (шаг time-max, `timerStarted: true` → `false`).
- [ ] **Step 2: Тесты падают.**
- [ ] **Step 3: Реализация.** `WorkoutStage`: `step.kind === 'time' && isOpenTime(step.plan) && session.timerStarted` → `StopwatchStage`: отсчёт вверх от «Старт» (без подготовительного счёта, без сигнала конца), кнопка «Стоп» открывает окно результата с `initialSec` = прошедшим временем. Пауза — как у `TimedStage`.
- [ ] **Step 4: История `StopwatchMax`** в окне `a15`; `npm run test:stories -- WorkoutFlow`.
- [ ] **Step 5: Тесты проходят.**
- [ ] **Step 6: Commit** — `feat(workout): время на максимум — секундомер`

### Task 4: Заметка упражнения, стороны в основной части, заметка тренировки на старте

**Files:**
- Modify: `web/src/features/workout/flow/format.ts` (`formatPlan` — суффикс сторон)
- Modify: экран подхода (`StageView` в `web/src/features/workout/WorkoutFlow/`) — заметка под названием
- Modify: `web/src/features/workout/StartScreen/StartScreen.tsx` — `notes` над составом (файл в конфликте слияния: начинать после его разрешения)
- Test: `format.test.ts`; истории `StageView`, `StartScreen`

**Interfaces:**
- Consumes: Task 1 (`Exercise.note`, `Exercise.sides`, `Workout.notes`)
- Produces: `formatPlan(kind, plan, sides?: [string, string]): string`

- [ ] **Step 1: Тест** — `formatPlan('reps', {target:{min:10,max:10}}, ['левая нога','правая нога'])` → `'10 повт на сторону'`.
- [ ] **Step 2: Тест падает; реализация; проходит.** Длинная заметка (больше двух строк) обрезается и раскрывается кнопкой «Ещё».
- [ ] **Step 3: Истории** `NoteUnderExercise`, `StartWithNotes` в окне `a15`; `npm run test:stories`.
- [ ] **Step 4: Commit** — `feat(workout): заметки упражнения и тренировки на экране`

### Task 5: Шаг-заметка с ответом

**Files:**
- Modify: `web/src/features/workout/flow/buildSteps.ts` (шаг для `NoteBlock`)
- Modify: `web/src/features/workout/flow/session.ts` (`answers` в состоянии, действие `answer`)
- Modify: `web/src/features/workout/flow/finish.ts:13-50` (`finishStats`, `sessionSteps`)
- Modify: `web/src/features/workout/WorkoutFlow/WorkoutFlow.tsx` (новый `NoteStage`)
- Modify: `shared/types.ts` (`SessionResult.answers`, `SessionReviewResponse.answers`)
- Modify: `server/db.ts` (`sessions_done.answers TEXT`), `server/workouts.ts` (запись итога и проверка), `server/sessionReview.ts` (раздел ответов)
- Modify: страница разбора тренером (`web/src/features/review/`) — раздел «Ответы»
- Test: `buildSteps.test.ts`, `session.test.ts`, `finish.test.ts`, `server/sessionReview.test.ts`, `server/workouts.test.ts`; истории `NoteStage`, разбор

**Interfaces:**
- Consumes: Task 1 (`NoteBlock`)
- Produces:
  - `Step.mode === 'note'`, `Step.note?: { title: string; text: string }`; у шага-заметки `record: false`, `restAfterSec: 0`
  - `Action` += `{ type: 'answer'; text: string }`; `Session.answers: Record<number, string>` (индекс шага → текст)
  - `interface NoteAnswer { blockIndex: number; title: string; text: string }`; `SessionResult.answers?: NoteAnswer[]` (пустые ответы не пишутся; текст до 1000)
  - `SessionReviewResponse.answers: NoteAnswer[]`

- [ ] **Step 1: Тесты** — `note block becomes one step` (блок `note` → один шаг `mode: 'note'`, `note.title`); `note step is not a set in finish stats` (`finishStats` не считает его подходом; `sessionSteps` его не возвращает); `answer stored by step index`; `server: session answers saved and shown in review` (POST итога с `answers: [{ blockIndex: 2, title: 'Тест большого пальца', text: 'Боли нет' }]` → разбор возвращает тот же массив); `server: rejects answer over 1000`.
- [ ] **Step 2: Тесты падают.**
- [ ] **Step 3: Реализация.** `NoteStage`: заголовок, текст, поле «Ответ» (`<textarea>` с `<label>`), «Готово»; «Пропустить» и «Назад» как у подхода. Ответ не обязателен.
- [ ] **Step 4: Истории** `NoteStage` (с ответом и без) и разбор с разделом «Ответы»; `npm run test:stories`.
- [ ] **Step 5: Тесты проходят, `npm run build`.**
- [ ] **Step 6: Commit** — `feat(workout): шаг-заметка с ответом спортсмена`

### Task 6: Любое упражнение в разминке

**Files:**
- Modify: `web/src/features/import/parse.ts:412-448` (`readTimed`: убрать проверку `не упражнение на время`; пул «похожего» — вся библиотека)
- Modify: `server/routines.ts:130-140` (убрать `not_time`, `ROUTINE_NOT_TIME`), `server/routinesRouter.ts` (ветка ошибки)
- Modify: `web/src/features/routines/RoutineForm/RoutineForm.tsx`, `web/src/features/builder/NewRoutineCard/` (проверка и фильтр выбора)
- Test: `web/src/features/import/parse.test.ts` (новый тест), `server/routines.test.ts`, `server/routinesRouter.test.ts`

**Interfaces:**
- Produces: `createRoutine`/`updateRoutine` возвращают ошибки только `unknown_exercise | duplicate`

- [ ] **Step 1: Тесты** — `v1 routine accepts reps exercise` (набор с упражнением библиотеки kind reps и `time: 30s` разбирается, `routines[0].items[0].sec` = `{30,30}`); `createRoutine accepts reps exercise`. Существующие тесты на `not_time` удалить — поведение меняет спек.
- [ ] **Step 2: Тесты падают; реализация; проходят.**
- [ ] **Step 3: Commit** — `feat(routines): в разминке любое упражнение библиотеки`

PR 1: `npm run lint && npm test && npm run build && npm run test:stories`, PR через `/mattpocock-skills:pr`.

---

## PR 2 — формат v2 (ветка `feat/import-format-v2`, после слияния PR 1)

Форма редактора (Task 9) — в этом PR, после YAML-редактора: слияние в main деплоит, и до v2 вкладка YAML не умеет новых полей, так что форма, создающая их раньше, теряла бы их при сохранении из YAML. После PR 1 новые поля есть только в модели и на экране; создать их ещё нечем.

### Task 7: Разбор v2

**Files:**
- Create: `web/src/features/import/v2.ts` — чтение упражнения блока, блока, позиции набора, тренировки v2 (чистые функции, вызываются из `parseImport`)
- Modify: `web/src/features/import/parse.ts` (`ParseIssue.path`, ветвление по `version`, подсказки к неизвестному `exercise_id`)
- Modify: `web/src/features/import/structure.ts` (`RawExercise.note`, `RawExercise.restSec`, `RawBlock` для `note` и `restAfter`, `buildBlock`)
- Test: Create `web/src/features/import/parse.v2.test.ts`

**Interfaces:**
- Produces:
  - `ParseIssue.path?: Array<string | number>` (у ошибок v2 — всегда)
  - `version: 1 | 2`; `version` другое — ошибка `'Нужно version: 1 или 2'`
  - `ParsedWorkout.notes?: string`
  - Поля v2 и их правила — раздел «Формат v2» спека, дословно
  - `V1_FIELD_HINTS: Record<string, string>` в `v2.ts`: `do` → `'В version: 2 — sets, reps и weight_kg'`, `rest` → `'В version: 2 — rest_sec'`, `time` → `'time_sec'`, `weight` → `'weight_kg'`, `per_side` → `'sides: [влево, вправо]'`, `name` → `'exercise_id: id из библиотеки или из exercises'`, `distance` → `'В version: 2 расстояния нет'`

- [ ] **Step 1: Тесты по таблице «Фикстура» спека**, каждый отдельно:
  - `rest_sec 180 in sets exercise` → `SetsExercise.restSec 180`;
  - `it.each(['3 мин', '2-3 мин', '2–3 мин'])('rest_sec %s is an error with hint')` → ошибка, подсказка `'rest_sec — целое число секунд, например 180'`, `path` до поля (агент такие строки писать не может — схема требует целое, — но человек в YAML может);
  - `time_sec max` → `kind time, target {0,0}`;
  - `reps max`; `reps "12-14" in circuit without sets`;
  - `reps "10-12" with weight_kg 8` → `weight 8, kind weight`; отдельно `reps "12-14" with weight_kg 20` → `weight 20`;
  - `sets 1 reps 5 notes` → `note 'на каждую букву'`; `sets 2 reps 2 notes`;
  - `note block` → `NoteBlock` с `title`, `text`;
  - `v1 field in v2 names the v2 field` (`do: "3x12"` → ошибка с текстом `V1_FIELD_HINTS.do`, `path` до поля);
  - `routine item reps exercise time_sec 30`;
  - `unknown exercise_id suggests closest ids` (`pull-up` при библиотеке `pullup` → подсказка содержит `pullup`);
  - `routine id used as exercise_id` → подсказка `'это id разминки'`;
  - `sets in circuit is an error`, `rest_sec on circuit exercise is an error`, `weight_kg without reps is an error`, `reps and time_sec together is an error`, `sides with one label is an error`, `time_sec max in timed block is an error`;
  - `circuit rest_sec is after round` → `restAfter 'round'`, `restSec 90`;
  - `workout notes parsed`;
  - `warmup with inline exercises is an error in v2`.
- [ ] **Step 2: `npm test -- parse.v2`** — падают; `npm test -- web/src/features/import` — v1 зелёный.
- [ ] **Step 3: Реализация.** Ветвление в `parseImport` только в местах, где версии различаются (упражнение блока, блок, позиция набора, поля тренировки, `units`); всё остальное общее.
- [ ] **Step 4: Все тесты импорта проходят, тесты v1 не тронуты.**
- [ ] **Step 5: Commit** — `feat(import): формат version: 2`

### Task 8: YAML-редактор пишет v2

**Files:**
- Modify: `web/src/features/trainer/WorkoutEditPage/workoutYaml.ts` (`workoutToYaml`, `workoutFromYaml`)
- Test: `web/src/features/trainer/WorkoutEditPage/workoutYaml.test.ts` (новые тесты v2; старые на чтение v1 остаются)

**Interfaces:**
- Consumes: Task 7
- Produces: `workoutToYaml(title, blocks, links, library: LibraryExercise[], notes?: string): string` пишет `version: 2`; `legacyCircuitWarnings(blocks: Block[]): string[]`

- [ ] **Step 1: Тесты** — `round trip v2 keeps notes, restSec, restAfter, sides, note block, time max` (to → from даёт те же блоки); `exercise_id by library alias`; `unknown name written as exercise_id gives unknown exercise_id`; `legacy circuit warning text` → `'Отдых в круге «Круг» после сохранения будет после круга, а не после каждого упражнения'`; `reads v1 as before`.
- [ ] **Step 2: Тесты падают; реализация; проходят.** Предупреждение показывается над YAML-текстом в редакторе.
- [ ] **Step 3: Commit** — `feat(trainer): YAML-редактор пишет version: 2`

### Task 9: Форма редактора

**Files:**
- Modify: `web/src/features/trainer/WorkoutEditPage/draft.ts` (операции)
- Modify: `web/src/features/trainer/WorkoutEditPage/WorkoutEditView.tsx` (поля)
- Modify: страница редактора и `BuilderReviewView` — проброс `notes`
- Test: `web/src/features/trainer/WorkoutEditPage/draft.test.ts`; истории `WorkoutEditView`

**Interfaces:**
- Consumes: Task 1 (поля модели), Task 8 (YAML-вкладка сохраняет их без потерь)
- Produces (в `draft.ts`):
  - `setExerciseRest(blocks, blockId, exerciseId, restSec: number): Block[]` (только `sets`)
  - `setExerciseNote(blocks, blockId, exerciseId, note: string): Block[]` (пустая строка убирает поле)
  - `setOpen(blocks, blockId, exerciseId, open: boolean): Block[]` (target `{0,0}` или значение по умолчанию из `PickedExercise.defaults`)
  - `clearSides(blocks, blockId, exerciseId): Block[]`
  - `newBlock(blocks, 'note')` → `{ mode: 'note', title: 'Заметка', text: '' }`; `setNoteText(blocks, blockId, text): Block[]`
  - новый круг из `newBlock(…, 'circuit')` пишется с `restAfter: 'round'`
  - `MODE_LABELS.note = 'Заметка'`; `problems(...)` += «Заметка без текста»

- [ ] **Step 1: Тесты операций** — по одному на каждую функцию выше, с конкретными блоками; `new circuit rests after round`; `note block without text is a problem`.
- [ ] **Step 2: Тесты падают; реализация; проходят.**
- [ ] **Step 3: Поля в форме:** заметка тренировки над блоками; у упражнения — «Заметка», в `sets` — степпер «Отдых» (`ParamStepper`, шаг 15, 0–3600), «На максимум»; у круга — подпись «Отдых после круга»; блок-заметка — заголовок и текст.
- [ ] **Step 4: Истории** `WithNotesAndRest`, `NoteBlock`; `npm run test:stories`.
- [ ] **Step 5: Commit** — `feat(trainer): заметки, отдых у упражнения и блок-заметка в редакторе`

### Task 10: Страница «Формат импорта» под v2

**Files:**
- Modify: `web/src/features/import/format.ts`
- Test: `web/src/features/import/format.test.ts` (Create, если нет)

- [ ] **Step 1: Тест** — `every format example parses` (каждый `code` из `format.ts`, собранный в документ `version: 2`, проходит `parseImport` без ошибок); `mentions v1 still read` (на странице есть строка `'Файлы с version: 1 тоже читаются'`).
- [ ] **Step 2: Тест падает; переписать содержимое под раздел «Формат v2» спека; проходит.**
- [ ] **Step 3: Commit** — `docs(import): страница формата описывает version: 2`

PR 2: проверки и PR, как в PR 1.

---

## PR 3 — агент (ветка `feat/ai-builder-v2`, после слияния PR 2)

### Task 11: Схема агента v2

**Files:**
- Modify: `shared/aiDraft.ts` (типы, `AGENT_WORKOUT_SCHEMA`, `compactAgentWorkout`, `isAgentWorkout`)
- Modify: `web/src/features/builder/toImportDoc.ts` (`agentToImportYaml` пишет `version: 2`)
- Test: `shared/aiDraft.test.ts`, `web/src/features/builder/toImportDoc.test.ts`

**Interfaces:**
- Produces:
  - `AGENT_BLOCK_TYPES = ['sets', 'circuit', 'timed', 'note']`
  - `AgentExercise { exercise_id: string; sets?: number; reps?: string; time_sec?: number | 'max'; weight_kg?: number; rest_sec?: number; sides?: string[]; notes?: string }` (в схеме всё обязательное, пустые значения чистит `compactAgentWorkout`)
  - `AgentBlock { type; title?; rounds?; rest_sec?; text?; exercises: AgentExercise[] }` (в схеме всё обязательное, `exercises` без `minItems`)
  - `AgentRoutineItem { exercise_id: string; time_sec: number; sides?: string[] }` (`sides` в схеме обязательное)
  - `AgentWorkout.notes` в схеме обязательное

- [ ] **Step 1: Тесты** — счёт лимитов (необязательных ≤ 24, union ≤ 16, у объекта ≤ 3) на новой схеме; `time_sec` — единственный новый union; `compact drops empty time_sec, weight_kg, rest_sec, sides, notes, text`; `isAgentWorkout accepts note block with empty exercises`; `agentToImportYaml writes version 2 and parses` (ответ с блоками `sets`, `circuit`, `note` и своей разминкой → `parseImport` ok).
- [ ] **Step 2: Тесты падают; реализация; проходят.**
- [ ] **Step 3: Спросить пользователя и запустить `npm run smoke:ai`** — ожидается ответ без «Schema is too complex».
- [ ] **Step 4: Commit** — `feat(ai): схема ответа агента по формату version: 2`

### Task 12: Инструкции и запрос

**Files:**
- Modify: `server/aiInstructions.ts` (`AGENT_INSTRUCTIONS`, `AGENT_FORMAT`)
- Modify: `server/aiPrompt.ts:73-95` (подписи частей)
- Test: `server/aiPrompt.test.ts`, Create `server/aiInstructions.test.ts`

**Interfaces:**
- Consumes: Task 11 (поля схемы)

- [ ] **Step 1: Тесты** — `instructions mention every schema field` (каждое имя поля из `AGENT_WORKOUT_SCHEMA` встречается в `AGENT_FORMAT`); `instructions have sides examples` (есть `[влево, вправо]`, `[левая нога, правая нога]`); `instructions have no v1 fields` (нет `do`, `per_side`, `"4x8 @ 60"`); `prompt labels exercise and routine ids` (части запроса начинаются с `'Библиотека упражнений — id упражнений (JSON)'` и `'Разминки и заминки — id наборов (JSON)'`).
- [ ] **Step 2: Тесты падают.**
- [ ] **Step 3: Переписать тексты** по разделу «Схема и инструкции агента» спека: каждое правило оттуда — отдельный пункт; правило перевода повторов (≈3 с на повтор, до 5 с; «5 × 3 с» → 15 с; время на сторону) и текст заметки «В разминке упражнения только на время: …»; копирование набора по названию того же вида и «Взял за основу „…“». Кешируемое начало остаётся не короче 512 токенов.
- [ ] **Step 4: Тесты проходят.**
- [ ] **Step 5: Commit** — `feat(ai): инструкции агента по формату version: 2`

### Task 13: Ремонт ответа и пометки

**Files:**
- Create: `web/src/features/builder/repair.ts`
- Modify: `web/src/features/builder/build.ts` (`buildWorkout`)
- Modify: `web/src/features/builder/types.ts` (`BuilderDraft`)
- Modify: `web/src/features/builder/fromParsed.ts` (`notes`, пометки)
- Test: Create `web/src/features/builder/repair.test.ts`; `build.test.ts`, `fromParsed.test.ts`

**Interfaces:**
- Consumes: Task 7 (`ParseIssue.path`), Task 11 (типы агента)
- Produces:
  - `interface DraftMark { blockIndex: number; exerciseIndex: number; field: string; wrote: string; message: string }`
  - `interface Unparsed { what: string; message: string }` (что написал агент — имя или id; почему не подошло)
  - `toAgentPath(path: Array<string | number>, w: AgentWorkout): AgentPath | null` — путь ошибки в документе импорта → место в ответе агента. Документ строит `agentToImportYaml`: блок-ссылка разминки стоит первым (`workouts[0].blocks[i]` — это `blocks[i-1]` агента, если разминка есть), своя разминка и заминка лежат в `routines[k]`, новые упражнения — в `exercises[k]`. `type AgentPath = { at: 'exercise'; block: number; exercise: number; field?: string } | { at: 'block'; block: number } | { at: 'routine'; which: 'warmup' | 'cooldown' } | { at: 'newExercise'; index: number }`
  - `repairAgentWorkout(w: AgentWorkout, issues: ParseIssue[]): { workout: AgentWorkout; marks: DraftMark[]; unparsed: Unparsed[] }`. Правила:
    - поле, недопустимое в своём месте (`sets` в круге, `rest_sec` у упражнения круга, `weight_kg` без `reps`, второе из `reps`/`time_sec`, `time_sec: max` в таймерном блоке), — убрать;
    - поле с неверным значением (`reps`, `time_sec`, `weight_kg`, `sets`, `rest_sec`, `sides`) — убрать;
    - после этого у упражнения нет нагрузки — значение по умолчанию по типу упражнения: `reps: '10'` или `time_sec: 30`;
    - каждое тронутое упражнение получает одну пометку с тем, что написал агент, и текстом первой ошибки;
    - неизвестный `exercise_id`, ошибка блока без упражнения — убрать упражнение или блок, запись в `unparsed`;
    - ошибка своей разминки или заминки — `null`, запись в `unparsed`;
    - ошибка нового упражнения — убрать его и все ссылки на него, запись в `unparsed`.
  - Ремонт идёт по кругу «разбор → ремонт» не больше 3 раз; не сошлось — `{ ok: false }`.
  - `BuilderDraft.notes: string`; `BuilderDraft.marks: Record<string, DraftMark>` — ключ — id упражнения структуры (`b1-e2`), вычисляется по уже отремонтированному ответу, после всех удалений; `BuilderDraft.unparsed: Unparsed[]`
  - `buildWorkout(...)`: `BuildResult = { ok: true; draft: BuilderDraft }` после второй попытки агента и ремонта; `{ ok: false }` только если ремонт не сошёлся за 3 круга (ошибка программы)

- [ ] **Step 1: Тесты** —
  - `repair maps yaml path with warmup present` (своя разминка + ошибка в `blocks[1]` агента → пометка у `blocks[1]`, а не у `blocks[0]`); то же с ошибкой в `routines[0]` → своя разминка `null`;
  - по одному тесту ремонта на каждый класс ошибки v2 из Task 7 (`sets in circuit`, `rest_sec on circuit exercise`, `weight_kg without reps`, `reps and time_sec together`, `sides with one label`, `time_sec max in timed block`, неверный `reps`, неверный `time_sec`), в каждом — повторный разбор проходит;
  - `repairs bad load into mark` (`time_sec: 'до отказа'` → `time_sec: 30`, пометка с `wrote: 'до отказа'`);
  - `unknown exercise goes to unparsed`; `broken own routine becomes none`; `broken new exercise removed with its uses`;
  - `mark keys computed after removals` (убрано упражнение `blocks[0].exercises[0]`, помечено `blocks[0].exercises[2]` → ключ `b0-e1`);
  - `build returns draft after second failure` (поддельный `send` дважды отдаёт ответ с ошибкой → `ok: true`, `marks` не пуст);
  - `draft carries workout and exercise notes`.
- [ ] **Step 2: Тесты падают; реализация; проходят.**
- [ ] **Step 3: Поднять версию черновика в `web/src/features/builder/storage.ts`** (форма `BuilderDraft` изменилась; старый черновик сбрасывается, как при битом JSON) и тест `old draft version is discarded` в `storage.test.ts`.
- [ ] **Step 4: Commit** — `feat(builder): черновик с пометками вместо отказа`

### Task 14: Пометки и «Не разобрал» на странице проверки

**Files:**
- Modify: `web/src/features/builder/BuilderReviewView/BuilderReviewView.tsx` (+ `.module.css`)
- Modify: `web/src/features/trainer/WorkoutEditPage/WorkoutEditView.tsx` (проп `marks`, показ у упражнения)
- Modify: `web/src/features/builder/draftOps.ts` (снятие пометки)
- Modify: `web/src/features/builder/toCommit.ts` (`notes` тренировки)
- Test: `draftOps.test.ts`, `toCommit.test.ts`; истории `BuilderReviewView`

**Interfaces:**
- Consumes: Task 13 (`BuilderDraft.marks`, `unparsed`, `notes`)
- Produces: `clearMarkOnChange(d: BuilderDraft, before: Block[], after: Block[]): BuilderDraft` — пометка снимается, если у этого упражнения изменилась нагрузка или оно убрано; `canSave(d: BuilderDraft): boolean` — `false`, пока `marks` не пуст

- [ ] **Step 1: Тесты** — `mark cleared when load changed`; `mark kept when only note changed`; `mark cleared when exercise removed`; `save disabled while marks remain`; `commit carries workout notes`.
- [ ] **Step 2: Тесты падают; реализация; проходят.**
- [ ] **Step 3: Вид.** У помеченного упражнения текст «Проверьте нагрузку» и «Агент написал: …» (не только цветом). Над формой список «Не разобрал» рядом с заметками агента. «Сохранить» недоступна, рядом «Осталось проверить: 2».
- [ ] **Step 4: Истории** `WithMarks`, `WithUnparsed` в окне `a15`; `npm run test:stories`.
- [ ] **Step 5: Commit** — `feat(builder): пометки и «Не разобрал» на странице проверки`

### Task 15: Тест на сохранённых ответах агента

**Files:**
- Create: `web/src/features/builder/__fixtures__/README.md` (как сохранить сырой ответ из замера)
- Create: `web/src/features/builder/fixtures.test.ts`

**Interfaces:**
- Consumes: Task 13 (`buildWorkout`)

- [ ] **Step 1: Тест** — для каждого `*.json` в `__fixtures__/` (сырой `AgentWorkout`): `buildWorkout` с поддельным `send`, отдающим этот ответ, → `ok: true`, `marks` пуст, `unparsed` пуст, и пункты фикстуры находятся без молчаливых потерь. Сопоставление:
  - по частям: пункты основной части ищутся только среди названий упражнений основной части и заголовков шагов-заметок; пункты разминки — среди позиций своей разминки и в тексте advice о переводе; пункты заминки — среди позиций своей заминки;
  - один к одному: каждое упражнение черновика закрывает не больше одного пункта (жадно, начиная с самых узких шаблонов);
  - без учёта регистра, ё = е; `\b` не использовать — в JS он не работает с кириллицей; подписи сторон в сопоставлении не участвуют.
  - `MAIN_ITEMS`: лицевая тяга `/лицев/`; Y-T-W `/y-?t-?w/`; отжимания `/отжим/`; вис `/^вис|[^а-я]вис(?!е)/` (не «в висе»); чистые подтягивания `/подтяг(?!.*резин)/`; подтягивания с резинкой `/подтяг.*резин/`; подъём коленей в висе `/колен.*вис/`; медленное опускание `/опускан/`; тест пальца `/пал[ье]ц/` (шаг-заметка); сгибание с гантелью `/сгибан/`; мёртвая тяга `/м[её]ртв/`; подъём ног на столе `/подъ[её]м ног/`.
  - `WARMUP_ITEMS`: мобилизация запястья `/запяст/`; открытая книга `/книг/`; поза 90/90 `/90\/90/`; глубокий присед `/присед/`; подъём колена с резинкой `/колен/`.
  - `COOLDOWN_ITEMS`: трапеция `/трапец/`; грудной отдел на ролле `/грудн/`.
  - Отдельный тест сопоставления на собранном вручную черновике, где пропущен вис: тест падает. Без файлов — `test.skip` с сообщением «Нет сохранённых ответов агента».
- [ ] **Step 2: `npm test -- fixtures`** — пропущен (файлов нет).
- [ ] **Step 3: Commit** — `test(builder): прогон сохранённых ответов агента`

PR 3: проверки и PR, как в PR 1. После слияния пользователь делает замер вручную: до 4 сборок фикстуры, Haiku 5.5, adaptive, effort medium; сырые ответы кладёт в `__fixtures__/`.
