# Сборка тренировки агентом — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Тренер или админ на одной странице описывает разминку, основную часть и заминку, Haiku 5.5 собирает тренировку, тренер правит её в форме и одним «Сохранить» создаёт упражнения, разминки и тренировку на день.

**Architecture:** Сервер собирает кешируемый запрос (инструкции → формат → правила → разминки → библиотека → ввод) и получает от модели JSON строго по схеме. Браузер превращает JSON в документ импорта, прогоняет через существующий `parseImport`, строит черновик формы и сохраняет его существующим `POST …/imports` (`applyImport`, одна транзакция, отмена как у импорта). Ввод и черновик живут в localStorage до сохранения.

**Tech Stack:** Express 5, better-sqlite3 (чистый SQL), React 19, react-router 7, `yaml`, `@anthropic-ai/sdk` (новая), vitest, Storybook, Biome.

**Spec:** `docs/superpowers/specs/2026-11-17-ai-workout-builder-design.md`

## Global Constraints

- Модель: `claude-haiku-5-5`. Ключ: `ANTHROPIC_API_KEY`, только на сервере; в CI ключа нет, тесты в сеть не ходят.
- Доступ к сборке: только trainer и admin; к правилам — только admin. Спортсмен по «Создать тренировку» попадает в `/import?date=…`, как сейчас.
- Без ORM, чистый SQL; миграции — в `migrate()` в `server/db.ts`, идемпотентно.
- CSS только на переменных `tokens.css`; Radix — только для поведения. Кнопки ≥ 44 px, настоящие `<button>/<a>/<input>+<label>`, состояние не только цветом, `prefers-reduced-motion`, safe-area снизу.
- Тексты: русский, коротко, без «!» и эмодзи; «60 кг × 10», «90 с», мм:сс; числа tabular-nums.
- Порядок частей запроса: 1 инструкции+схема, 2 формат, 3 правила (точка кеша), 4 разминки, 5 библиотека без `demo` (точка кеша), 6 ввод. Сериализация детерминированная, сортировка по id. TTL кеша — стандартные 5 минут (`{ type: 'ephemeral' }`, без `ttl`).
- Лимит текстового поля ввода — 2000 символов. В лог — пользователь и токены (input, cache_creation, cache_read, output), без текста ввода и ответа.
- Черновик в localStorage: ключ по пользователю, ученику (или `own`) и дате; версия 1; срок 7 дней; все обращения в try/catch.
- Начальный текст правил: «В разминке и заминке сначала упражнения стоя, потом сидя, потом лёжа, чтобы не вставать и не ложиться несколько раз.»
- После каждой задачи `npm run build` без ошибок типов; `npm run lint` чистый (исключения только `biome-ignore` с причиной).
- Коммиты — Conventional Commits 1.0.0, конец сообщения `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Перед коммитом — навык `/mattpocock-skills:pr` (CLAUDE.md).
- В main не пушить. Три PR, каждый из своей ветки от main; перед PR локально `npm run lint && npm test && npm run build && npm run test:stories`.

## Review Focus

- Модель вернула `exercise_id`, которого нет в библиотеке: `parseImport` даёт ошибку, браузер один раз повторяет запрос с ошибками, а на второй неудаче показывает ошибки и «Пересобрать» (Task 6, тест `retries once with parse errors`).
- В localStorage битый JSON, старая версия или черновик старше 7 дней: страница открывается с чистого листа и удаляет запись (Task 7).
- Тренер переименовал новое упражнение в название или алиас библиотечного: при сохранении оно не создаётся заново, а тренировка ссылается на библиотечное (Task 9, тест `new exercise renamed to library name is not created`).
- Спецсимволы в названиях и заметках от модели (`:`, `#`, кавычки «», переносы строк) не ломают YAML-документ импорта (Task 6, тест `survives yaml special characters`).
- Пустой ввод: нет текста, нет выбранных упражнений в основной части — кнопка «Собрать» недоступна, сервер отвечает 400 (Task 5 и Task 6, `canBuild`).

---

## PR 1 — правила агента (ветка `feat/ai-rules`)

Первым коммитом ветки — спецификация и этот план: `docs(ai): дизайн и план сборки тренировки агентом`
(только два файла `2026-11-17-ai-workout-builder*`, чужие неотслеживаемые файлы в `docs/` не трогать).

### Task 1: Хранение и API правил

**Files:**
- Create: `server/aiRules.ts`, `server/aiRulesRouter.ts`
- Modify: `server/db.ts` (schema), `server/index.ts` (подключение), `shared/types.ts` (тип ответа)
- Test: `server/aiRules.test.ts`, `server/aiRulesRouter.test.ts`

**Interfaces:**
- Produces:
  - `shared/types.ts`: `export interface AiRules { text: string; updatedAt: string | null; updatedBy: string | null }` (`updatedBy` — display_name или email автора).
  - `server/aiRules.ts`: `export const DEFAULT_AI_RULES: string` (текст из Global Constraints); `export function getAiRules(db: Db): AiRules` (нет строки — `{ text: DEFAULT_AI_RULES, updatedAt: null, updatedBy: null }`); `export function setAiRules(db: Db, actorId: number, text: string, clock: () => Date = () => new Date()): AiRules`; `export const AI_RULES_MAX = 20000`.
  - `GET /api/admin/ai-rules` → `AiRules`; `PUT /api/admin/ai-rules` body `{ text: string }` → `AiRules`. Не admin — 403 `{ error: 'Правила меняет админ' }`; текст не строка или длиннее `AI_RULES_MAX` — 400.
  - `server/aiRulesRouter.ts`: `export function aiRulesRouter(db: Db): Router`.

- [ ] **Step 1: Тесты хранения** — `server/aiRules.test.ts` на `openDb(':memory:')`:
  - `returns default rules when none saved`: `getAiRules(db)` → `{ text: DEFAULT_AI_RULES, updatedAt: null, updatedBy: null }`.
  - `saves text with author and time`: `setAiRules(db, adminId, 'Отдых 90 с', () => new Date('2026-11-17T18:40:00Z'))`, затем `getAiRules(db)` → `text === 'Отдых 90 с'`, `updatedAt === '2026-11-17T18:40:00.000Z'`, `updatedBy` — имя админа.
  - `second save replaces the first`: два `setAiRules` → в таблице одна строка, текст последний.
- [ ] **Step 2:** `npx vitest run --project unit server/aiRules.test.ts` — FAIL (модуля нет).
- [ ] **Step 3:** Таблица в `schema` `server/db.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS ai_rules (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    text TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  );
  ```
  `setAiRules` — `INSERT … ON CONFLICT(id) DO UPDATE`. Реализовать `server/aiRules.ts`.
- [ ] **Step 4:** Тест из шага 2 — PASS.
- [ ] **Step 5: Тесты роутера** — `server/aiRulesRouter.test.ts` по образцу `server/routinesRouter.test.ts` (express на случайном порту, куки через `login`): `athlete and trainer get 403`, `admin reads default`, `admin saves and reads back`, `rejects text over AI_RULES_MAX with 400`, `anonymous gets 401`.
- [ ] **Step 6:** FAIL → реализовать роутер (`requireUser(db)`, проверка `req.user!.role === 'admin'`), подключить в `server/index.ts` → PASS.
- [ ] **Step 7:** `npm run build && npm run lint`, коммит `feat(ai): правила агента — хранение и API для админа`.

### Task 2: Страница правил для админа

**Files:**
- Create: `web/src/app/auth/RequireAdmin.tsx`, `web/src/features/aiRules/{api.ts,index.ts}`, `web/src/features/aiRules/AiRulesView/{AiRulesView.tsx,AiRulesView.module.css,AiRulesView.stories.tsx}`, `web/src/features/aiRules/AiRulesPage/AiRulesPage.tsx`
- Modify: `web/src/app/auth/roles.ts`, `web/src/app/routes.tsx`, страница профиля (`web/src/features/auth` → `ProfilePage`) — ссылка «Правила агента» только для admin.

**Interfaces:**
- Consumes: `AiRules`, `GET/PUT /api/admin/ai-rules` (Task 1).
- Produces: `roles.ts`: `export const isAdmin = (role: Role): boolean => role === 'admin'`; `RequireAdmin()` — как `RequireTrainer`, не админа → `<Navigate to="/" replace />`; маршрут `admin/ai-rules`; `api.ts`: `fetchAiRules(): Promise<AiRules>`, `saveAiRules(text: string): Promise<AiRules>`.
- `AiRulesView` props: `{ rules: AiRules; text: string; saving: boolean; error: string | null; saved: boolean; onText(t: string): void; onSave(): void }`.

- [ ] **Step 1:** Истории `AiRulesView.stories.tsx`: `Default` (правила по умолчанию, строки «Изменено» нет), `Edited` (строка «Изменено 17 ноя, 21:40 · Никита»), `Saving`, `Error`. В play-функции `Edited`: textarea с label «Правила для агента» видна, кнопка «Сохранить» — `<button>`, текст «Изменено 17 ноя, 21:40 · Никита» на экране.
- [ ] **Step 2:** `npx vitest run --project storybook web/src/features/aiRules` — FAIL.
- [ ] **Step 3:** Реализовать `AiRulesView` (TextArea из `web/src/ui`, `Button`, `Notice`), `AiRulesPage` (загрузка, сохранение, после успеха — «Сохранено»), `RequireAdmin`, маршрут под `<Route element={<RequireAdmin />}>` внутри `AppShell`, ссылку в профиле.
- [ ] **Step 4:** Истории — PASS; `npm run build && npm run lint`.
- [ ] **Step 5:** Коммит `feat(ai): страница правил агента для админа`. PR 1: прогнать lint/test/build/test:stories, навык `/mattpocock-skills:pr`, открыть PR.

---

## PR 2 — сборка на сервере (ветка `feat/ai-workout-draft`)

### Task 3: Общие типы и JSON-схема ответа агента

**Files:**
- Create: `shared/aiDraft.ts`
- Test: `shared/aiDraft.test.ts`

**Interfaces:**
- Produces (все поля обязательны, «необязательное» выражено `null` — так требует строгий режим structured outputs):
  ```ts
  export type AgentMeasure = 'reps' | 'weight' | 'time' | 'distance';
  export interface AgentExercise { exercise_id: string | null; name: string | null; do: string | null; sets: number | null; reps: string | null; weight: string | null; time: string | null; rest: string | null; per_side: boolean | null; notes: string | null }
  export interface AgentBlock { type: 'sets' | 'circuit' | 'superset' | 'timed'; title: string | null; rounds: number | null; rest: string | null; exercises: AgentExercise[] }
  export interface AgentRoutineItem { exercise_id: string | null; name: string | null; time: string; per_side: boolean | null; sides: string[] | null }
  export interface AgentRoutine { routine: string | null; new_routine: { id: string; title: string; exercises: AgentRoutineItem[] } | null }
  export interface AgentNewExercise { id: string; name: string; muscles: string[]; measure: AgentMeasure; equipment: string[]; notes: string | null; aliases: string[] }
  export interface AgentAdvice { text: string; exercise: string | null; suggest: string | null }
  export interface AgentWorkout { title: string; notes: string | null; warmup: AgentRoutine; cooldown: AgentRoutine; blocks: AgentBlock[]; new_exercises: AgentNewExercise[]; advice: AgentAdvice[] }
  export const AGENT_WORKOUT_SCHEMA: Record<string, unknown>; // JSON Schema того же AgentWorkout
  export type RoutineAsk = { routine: string } | { text: string } | null;
  export interface DraftRequest { athleteId: number | null; date: string; title: string; warmup: RoutineAsk; main: { text: string; exercises: string[] }; cooldown: RoutineAsk; errors?: string[] }
  export interface DraftResponse { workout: AgentWorkout }
  export const DRAFT_TEXT_MAX = 2000;
  export function isAgentWorkout(v: unknown): v is AgentWorkout;
  ```
- [ ] **Step 1:** Тесты: `schema lists every AgentWorkout key as required` (для каждого объекта схемы `required` совпадает с ключами `properties`, `additionalProperties: false`); `isAgentWorkout accepts minimal workout` (пустые массивы, `null` в routine); `isAgentWorkout rejects missing blocks`.
- [ ] **Step 2:** FAIL → **сверить с документацией Anthropic**, какие ключевые слова JSON Schema поддерживают structured outputs у `claude-haiku-5-5` (nullable через `type: [..., 'null']` или `anyOf`, `enum`, вложенные массивы). Писать схему только поддерживаемым подмножеством; итог проверки — комментарием над `AGENT_WORKOUT_SCHEMA` со ссылкой на страницу документации.
- [ ] **Step 3:** Реализовать → PASS → `npm run build`, коммит `feat(ai): схема ответа агента`.

### Task 4: Сборка запроса с кешем

**Files:**
- Create: `server/aiPrompt.ts`, `server/aiInstructions.ts`
- Test: `server/aiPrompt.test.ts`

**Interfaces:**
- Consumes: `AiRules` (Task 1), `DraftRequest` (Task 3), `libraryOf`/`ensureLibrary` из `server/imports.ts`.
- Produces:
  ```ts
  // server/aiInstructions.ts — тексты из кода
  export const AGENT_INSTRUCTIONS: string; // роль, порядок работы, как выбирать exercise_id, когда new_exercises, когда advice с suggest, явно выбранные упражнения обязательны
  export const AGENT_FORMAT: string;       // значения полей: do «4x8 @ 60», reps «8-12»/max, time 45s/1:30, rest, типы блоков, per_side/sides, new_routine только из упражнений на время
  // server/aiPrompt.ts
  export interface PromptRoutine { id: string; kind: RoutineKind; title: string; items: Array<{ exercise: string; sec: number; sides: [string, string] | null }> }
  export interface PromptExercise { id: string; name: string; aliases: string[]; kind: ExerciseKind; muscles: string[]; equipment: string[] }
  export type SystemBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };
  export interface Prompt { system: SystemBlock[]; user: string }
  export function promptLibrary(db: Db): PromptExercise[];   // сортировка по id, без demo/notes
  export function promptRoutines(db: Db): PromptRoutine[];   // SQL: routines ⋈ routine_items ⋈ exercises, ORDER BY routines.slug, position
  export function buildPrompt(p: { rules: string; routines: PromptRoutine[]; library: PromptExercise[]; request: DraftRequest; today: string }): Prompt;
  ```
- [ ] **Step 1: Тесты** `server/aiPrompt.test.ts`:
  - `orders parts from stable to volatile`: `system.map(b => b.text)` — `[AGENT_INSTRUCTIONS, AGENT_FORMAT, rules…, routines…, library…]` (ровно 5 блоков; правила, разминки, библиотека — по вхождению своих данных).
  - `puts cache breakpoints after rules and library only`: `cache_control` есть у блоков 2 и 4 (с 0), `{ type: 'ephemeral' }`, у остальных нет.
  - `serializes library deterministically`: одна библиотека в двух порядках → одинаковый текст блока 4; в тексте нет `demo`.
  - `request goes only to user message`: текст основной части и `errors` встречаются в `user`, а в `system` нет.
  - `promptLibrary drops demo and sorts by id` (на `:memory:` с двумя упражнениями, одно с роликом).
  - `promptRoutines returns items in position order`.
- [ ] **Step 2:** FAIL → реализовать. Части 3–5 — JSON (`JSON.stringify` без отступов) под коротким заголовком. **Сверить с документацией** минимальную кешируемую длину для Haiku 5.5 и лимит в 4 точки кеша; если начало запроса короче минимума, кеш просто не включится — это допустимо.
- [ ] **Step 3:** PASS → `npm run build`, коммит `feat(ai): запрос агенту с кешируемым началом`.

### Task 5: Клиент Anthropic, эндпоинт сборки, деплой ключа

**Files:**
- Create: `server/aiClient.ts`, `server/aiRouter.ts`
- Modify: `package.json` (`@anthropic-ai/sdk`), `server/index.ts`, `.github/workflows/deploy.yml`, `scripts/deploy.sh`
- Test: `server/aiRouter.test.ts`

**Interfaces:**
- Consumes: `buildPrompt`, `promptLibrary`, `promptRoutines` (Task 4); `getAiRules` (Task 1); `DraftRequest`, `DraftResponse`, `AGENT_WORKOUT_SCHEMA`, `isAgentWorkout`, `DRAFT_TEXT_MAX` (Task 3); `canAccessAthlete`, `canAddExercises`, `logger`.
- Produces:
  ```ts
  // server/aiClient.ts
  export interface AiUsage { input: number; cacheCreation: number; cacheRead: number; output: number }
  export interface AiClient { draft(prompt: Prompt, schema: Record<string, unknown>): Promise<{ json: unknown; usage: AiUsage }> }
  export const AI_EFFORT = 'medium'; // output_config.effort; подбирать по логам (качество против времени ответа)
  export function anthropicClient(apiKey: string): AiClient; // model 'claude-haiku-5-5', thinking: { type: 'adaptive' }, output_config.effort = AI_EFFORT, таймаут 60 с, повторы SDK по умолчанию, без стриминга
  // server/aiRouter.ts
  export function aiRouter(db: Db, client: AiClient | null): Router; // POST /ai/workout-draft
  ```
  Ответы: 200 `DraftResponse`; 400 — неверное тело, поле длиннее `DRAFT_TEXT_MAX`, пустой ввод (нет `main.text`, нет `main.exercises`, нет текста разминки/заминки); 403 — athlete или нет доступа к `athleteId`; 503 `{ error: 'Сборка недоступна' }` — `client === null`; 502 `{ error: 'Агент не ответил, попробуйте ещё раз' }` — клиент бросил или вернул не `AgentWorkout`.
- [ ] **Step 1: Тесты** `server/aiRouter.test.ts` с поддельным `AiClient` (запоминает `prompt`, отдаёт фиксированный `AgentWorkout`): `athlete gets 403`, `trainer without link to athlete gets 403`, `returns 503 without client`, `rejects field over 2000 chars`, `rejects empty input`, `trainer gets workout for linked athlete`, `admin gets workout for own plan (athleteId null)`, `returns 502 when client throws`, `returns 502 when json is not a workout`, `passes saved rules into prompt` (после `setAiRules` текст правил есть в `prompt.system[2].text`).
- [ ] **Step 2:** FAIL → `npm install @anthropic-ai/sdk` (зачем: типизированные structured outputs и повторы при сбоях API — указать в описании PR). Реализовать `anthropicClient`: structured outputs со схемой; **если по документации для `claude-haiku-5-5` их нет — принудительный вызов инструмента** (`tool_choice` на единственный инструмент с `input_schema = schema`, `json` — его `input`; принудительный выбор инструмента может не сочетаться с thinking — тогда thinking выключить, сверить по документации). Роутер: `ensureLibrary`, `buildPrompt`, `client.draft`, `logger.info({ userId, athleteId, usage }, 'ai draft')`.
- [ ] **Step 3:** `server/index.ts`: `aiRouter(db, process.env.ANTHROPIC_API_KEY ? anthropicClient(process.env.ANTHROPIC_API_KEY) : null)`.
- [ ] **Step 4:** Деплой: в `deploy.yml` в `env` шага «Обновить сервер» — `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`, в строку ssh — `ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY'`; в `deploy.sh` добавить имя в цикл предупреждений («Предупреждение: ANTHROPIC_API_KEY не задан, сборка тренировок будет выключена»).
- [ ] **Step 5:** Тесты PASS, `npm run build && npm run lint`. Коммит `feat(ai): эндпоинт сборки тренировки на Haiku 5.5`. PR 2 по общим правилам. В описании PR: секрет `ANTHROPIC_API_KEY` нужно добавить в GitHub Secrets до слияния.

---

## PR 3 — страница сборки (ветка `feat/ai-workout-builder`)

Новая папка `web/src/features/builder/`. Все `.ts` в ней, кроме `api.ts` и `storage.ts`-обёрток, — чистые функции.

### Task 6: От ответа агента к черновику формы

**Files:**
- Create: `web/src/features/builder/types.ts`, `toImportDoc.ts`, `fromParsed.ts`, `build.ts`, `api.ts`
- Test: `toImportDoc.test.ts`, `fromParsed.test.ts`, `build.test.ts`

**Interfaces:**
- Consumes: `AgentWorkout`, `DraftRequest`, `DraftResponse`, `RoutineAsk` (Task 3); `parseImport`, `ParseContext`, `ParsedImport`, `ParseIssue` (`web/src/features/import/parse.ts`); `importSlug` (`shared/importSlug.ts`).
- Produces:
  ```ts
  // types.ts
  export type RoutineChoice = { kind: 'library'; slug: string } | { kind: 'text'; text: string } | { kind: 'none' };
  export interface BuilderInput { title: string; warmup: RoutineChoice; main: { text: string; picked: string[] /* slug */ }; cooldown: RoutineChoice }
  export interface NewExerciseDraft { name: string; slug: string; muscles: string[]; kind: ExerciseKind; equipment: string[]; notes: string; aliases: string[]; similar?: string /* имя из библиотеки */ }
  export interface NewRoutineItem { name: string; sec: number; sides?: [string, string] }
  export type RoutinePick = { kind: 'none' } | { kind: 'library'; slug: string } | { kind: 'new'; title: string; items: NewRoutineItem[] };
  export interface Advice { id: string; text: string; exercise?: string; suggest?: string /* имя из библиотеки */ }
  export interface BuilderDraft { date: string; title: string; blocks: Block[]; newExercises: NewExerciseDraft[]; warmup: RoutinePick; cooldown: RoutinePick; advice: Advice[] }
  export const EMPTY_INPUT: BuilderInput;
  export function canBuild(input: BuilderInput): boolean;
  export function toRequest(input: BuilderInput, date: string, athleteId: number | null): DraftRequest;
  // toImportDoc.ts
  export function agentToImportYaml(w: AgentWorkout, date: string): string; // yaml.stringify({ version: 1, exercises, routines, workouts: [{ title, date, notes, blocks: [warmup?, ...blocks, cooldown?] }] })
  // fromParsed.ts
  export function draftFromParsed(parsed: ParsedImport, agent: AgentWorkout, ctx: ParseContext, date: string, picked: string[]): BuilderDraft;
  // build.ts
  export type BuildResult = { ok: true; draft: BuilderDraft } | { ok: false; errors: ParseIssue[] };
  export function buildWorkout(req: DraftRequest, ctx: ParseContext, picked: string[], send: (r: DraftRequest) => Promise<DraftResponse>): Promise<BuildResult>;
  // api.ts
  export function requestDraft(r: DraftRequest): Promise<DraftResponse>; // POST /api/ai/workout-draft; ошибки сервера — Error с текстом из { error }
  ```
- [ ] **Step 1: Тесты `toImportDoc.test.ts`:**
  - `links library routine by slug`: `warmup.routine = 'neck-shoulders'` → в разобранном YAML первый блок `{ type: 'warmup', routine: 'neck-shoulders' }`.
  - `declares new routine in routines and links it`: `new_routine.id = 'my-warm'` → `routines[0].id === 'my-warm'`, блок `{ type: 'cooldown', routine: 'my-warm' }` последним.
  - `drops null fields`: в документе нет ключей со значением `null`.
  - `survives yaml special characters`: `title: 'Ноги: день #2 — «тяжёлый»'`, `notes: 'строка 1\nстрока 2'` → `parseImport(yaml, ctx)` ок, `workouts[0].title` совпадает.
- [ ] **Step 2: Тесты `fromParsed.test.ts`** (контекст — небольшая библиотека из 3 упражнений и одна разминка):
  - `main blocks come from structure`: `draft.blocks` равны `parsed.workouts[0].structure`.
  - `new exercise takes agent fields`: `muscles: ['трицепс']`, `measure: 'distance'` → `kind: 'time'`; `slug` = `id` агента; `similar` из `NewExercise.similar`.
  - `library warmup becomes library pick`, `new routine becomes new pick with names and seconds` (`time: '30s'` → `sec: 30`, `per_side` → `sides`).
  - `advice suggest slug becomes library name`; совет с неизвестным slug остаётся без `suggest`.
  - `missing picked exercise adds advice`: `picked = ['bench-press']`, в тренировке его нет → совет «Нет выбранного упражнения: Жим лёжа».
- [ ] **Step 3: Тесты `build.test.ts`** с поддельным `send`:
  - `returns draft on first good answer` (`send` вызван 1 раз).
  - `retries once with parse errors`: первый ответ с несуществующим `exercise_id` → второй вызов получил `errors` с текстом ошибки разбора; второй ответ хороший → `ok: true`, вызовов 2.
  - `gives up after second failure`: оба плохие → `ok: false`, `errors` непустые, вызовов 2.
  - `canBuild is false for empty input`, `canBuild is true with only picked exercises`.
- [ ] **Step 4:** FAIL → реализовать. В `draftFromParsed` имена упражнений разминки — по slug из `ctx.library` и `newExercises`.
- [ ] **Step 5:** PASS, `npm run build`, коммит `feat(builder): ответ агента → черновик формы`.

### Task 7: Черновик в localStorage

**Files:**
- Create: `web/src/features/builder/storage.ts`
- Test: `web/src/features/builder/storage.test.ts`

**Interfaces:**
- Consumes: `BuilderInput`, `BuilderDraft` (Task 6).
- Produces:
  ```ts
  export interface StoredBuilder { v: 1; savedAt: number; step: 'input' | 'review'; input: BuilderInput; draft: BuilderDraft | null }
  export const BUILDER_TTL_MS = 7 * 24 * 3600 * 1000;
  export const builderKey = (userId: number, athleteId: number | null, date: string) => `duo-builder:${userId}:${athleteId ?? 'own'}:${date}`;
  export function parseBuilder(raw: string | null, now: number): StoredBuilder | null;
  export function serializeBuilder(s: StoredBuilder): string;
  export function loadBuilder(key: string, now?: number): StoredBuilder | null; // битое — удаляет запись
  export function saveBuilder(key: string, s: StoredBuilder): void;
  export function clearBuilder(key: string): void;
  ```
- [ ] **Step 1: Тесты:** `round-trips input and draft`; `rejects other version`; `rejects older than 7 days` (`savedAt = now - BUILDER_TTL_MS - 1`); `rejects broken json`; `rejects wrong shape` (`{ v: 1 }`); `keys differ by athlete and date`.
- [ ] **Step 2:** FAIL → реализовать по образцу `web/src/features/workout/draftStorage.ts` → PASS → коммит `feat(builder): черновик сборки в браузере`.

### Task 8: Правка черновика

**Files:**
- Create: `web/src/features/builder/draftOps.ts`
- Test: `web/src/features/builder/draftOps.test.ts`

**Interfaces:**
- Consumes: `BuilderDraft`, `NewExerciseDraft`, `RoutinePick` (Task 6); `addExercise`, `PickedExercise` (`web/src/features/trainer/WorkoutEditPage/draft.ts`); `LibraryExercise`.
- Produces:
  ```ts
  export function createExercise(d: BuilderDraft, blockId: string, name: string): BuilderDraft; // в блок + newExercises (slug importSlug(name), kind 'reps', muscles [])
  export function patchNewExercise(d: BuilderDraft, name: string, patch: Partial<NewExerciseDraft>): BuilderDraft; // смена name переименовывает в блоках и в новой разминке/заминке
  export function replaceExercise(d: BuilderDraft, from: string, to: LibraryExercise): BuilderDraft; // имя и kind в блоках и разминках; новое без использования удаляется; советы про from удаляются
  export function applyAdvice(d: BuilderDraft, adviceId: string, library: LibraryExercise[]): BuilderDraft;
  export function dismissAdvice(d: BuilderDraft, adviceId: string): BuilderDraft;
  export function pruneNew(d: BuilderDraft): BuilderDraft; // убирает newExercises без использования
  export function setRoutine(d: BuilderDraft, which: 'warmup' | 'cooldown', pick: RoutinePick): BuilderDraft;
  export function patchRoutineItem(d: BuilderDraft, which: 'warmup' | 'cooldown', index: number, sec: number): BuilderDraft;
  export function moveRoutineItem(d: BuilderDraft, which: 'warmup' | 'cooldown', index: number, delta: -1 | 1): BuilderDraft;
  export function removeRoutineItem(d: BuilderDraft, which: 'warmup' | 'cooldown', index: number): BuilderDraft;
  export function renameRoutine(d: BuilderDraft, which: 'warmup' | 'cooldown', title: string): BuilderDraft;
  export function usedNames(d: BuilderDraft): Set<string>; // имена из блоков и новых разминок
  ```
- [ ] **Step 1: Тесты:** `createExercise adds row and new entry`; `renaming new exercise renames rows and routine items`; `replaceExercise swaps name and kind and drops unused new`; `replaceExercise keeps new exercise still used elsewhere`; `applyAdvice uses suggest and removes advice`; `removing last routine item keeps empty new routine` (проверка пустой разминки — в Task 9); `moveRoutineItem ignores out of range`.
- [ ] **Step 2:** FAIL → реализовать → PASS → коммит `feat(builder): правка черновика`.

### Task 9: Черновик → коммит импорта

**Files:**
- Create: `shared/displayBlocks.ts`, `web/src/features/builder/toCommit.ts`
- Modify: `server/workoutEdit.ts` (импортирует `displayBlocks` из `shared/displayBlocks.ts`, своя копия удаляется)
- Test: `shared/displayBlocks.test.ts` (перенести существующие проверки, если есть в `server/workoutEdit.test.ts`), `web/src/features/builder/toCommit.test.ts`

**Interfaces:**
- Consumes: `BuilderDraft` (Task 6), `usedNames` (Task 8), `problems` (`WorkoutEditPage/draft.ts`), `groupForMuscles`, `importSlug`, `ImportCommit`, `ParseContext`.
- Produces:
  ```ts
  // shared/displayBlocks.ts
  export function displayBlocks(blocks: Block[]): CommitBlock[]; // перенос из server/workoutEdit.ts без изменений поведения
  // toCommit.ts
  export type CommitCheck = { ok: true; commit: ImportCommit } | { ok: false; problems: string[] };
  export function draftToCommit(d: BuilderDraft, ctx: ParseContext): CommitCheck;
  ```
  Правила `draftToCommit`:
  - проблемы: всё из `problems(title, blocks)`; «У нового упражнения «X» не указаны мышцы»; «Разминка «T» уже есть — дайте другое название» (совпадение без учёта регистра с `ctx.routines` того же вида); «В разминке только упражнения на время: X»; «В новой разминке нет упражнений»;
  - новое упражнение, чьё имя без учёта регистра совпало с `name` или `aliases` библиотечного, не создаётся, а строки ссылаются на библиотечное имя;
  - slug нового, занятый в библиотеке, получает `-2`, `-3`… (как `slugOf` на сервере);
  - slug новой разминки — `importSlug(title)` с тем же суффиксом против `ctx.routines`;
  - `exercises` — только используемые новые, с явным `id`; `group: groupForMuscles(muscles с заглавной)`;
  - `workouts: [{ title, blocks: displayBlocks(blocks), structure: blocks, warmupRoutine?, cooldownRoutine? }]`, `entries: [{ date, workout: 0 }]`, `replaceDates: []`.
- [ ] **Step 1:** Перенести `displayBlocks` в `shared/`, поправить импорт в `server/workoutEdit.ts`; `npm test` — существующие тесты PASS.
- [ ] **Step 2: Тесты `toCommit.test.ts`:** `builds one workout on the date`; `links library routine and creates new one with exercise slugs`; `new exercise renamed to library name is not created`; `suffixes slug taken in library`; `reports duplicate routine title`; `reports non-time exercise in routine`; `reports new exercise without muscles`; `drops unused new exercises`.
- [ ] **Step 3:** FAIL → реализовать → PASS → `npm run build`, коммит `feat(builder): сохранение черновика через импорт`.

### Task 10: Форма редактора умеет новое

**Files:**
- Modify: `web/src/features/trainer/WorkoutEditPage/WorkoutEditView.tsx`, `WorkoutEditView.module.css`
- Create: `web/src/features/trainer/WorkoutEditPage/WorkoutEditView.stories.tsx` (если нет) — истории нового режима

**Interfaces:**
- Produces (новые необязательные props, старое поведение без них не меняется):
  ```ts
  /** 'create' — без переключателя «Форма / YAML» и без плашки «Изменения увидят все дни плана…» */
  mode?: 'edit' | 'create';
  /** Имена новых упражнений: строка с пометкой «новое» (текстом) и кнопкой «Открыть» */
  newNames?: ReadonlySet<string>;
  onOpenNew?: (name: string) => void;
  /** Есть — в выборе упражнения, когда поиск ничего не нашёл, кнопка «Создать „…“» */
  onCreateExercise?: (blockId: string, name: string) => void;
  /** Заменяют строку подключённой разминки/заминки */
  warmupSlot?: ReactNode;
  cooldownSlot?: ReactNode;
  /** Над формой: заметки агента */
  topSlot?: ReactNode;
  saveLabel?: string; // по умолчанию «Сохранить»
  ```
- [ ] **Step 1:** Истории: `CreateMode` (нет SegmentedControl «Как править», есть строка «Жим узкий · новое»), `CreateFromSearch` (play: открыть выбор упражнения, ввести «Отжимания с хлопком», нажать «Создать „Отжимания с хлопком“» → вызван `onCreateExercise` с id блока и именем).
- [ ] **Step 2:** FAIL → реализовать → истории PASS, существующие истории и `npm test` PASS → коммит `feat(editor): новые упражнения и слоты в форме тренировки`.

### Task 11: Экраны сборки

**Files:**
- Create в `web/src/features/builder/`: `BuilderInputView/{BuilderInputView.tsx,.module.css,.stories.tsx}`, `AdviceList/{…}`, `NewExerciseSheet/{…}`, `NewRoutineCard/{…}`, `BuilderReviewView/{…}`

**Interfaces:**
- Consumes: `BuilderInput`, `BuilderDraft`, `Advice`, `NewExerciseDraft`, `RoutinePick`, `canBuild` (Task 6); `WorkoutEditView` с props Task 10; `ParseIssue`.
- Produces:
  - `BuilderInputView` props: `{ dateLabel: string; input: BuilderInput; library: LibraryEntry[]; routines: ParseContext['routines']; building: boolean; error: string | null; issues: ParseIssue[]; restoredAt: number | null; onInput(i: BuilderInput): void; onBuild(): void; onReset(): void }`. Разминка и заминка — радиогруппа: готовые этого вида, «Описать свою» (появляется textarea), «Без разминки»/«Без заминки». Основная часть — textarea и поиск по библиотеке с чипами-удалением. Кнопка «Собрать тренировку» недоступна при `!canBuild(input)`. `restoredAt` → строка «Восстановлен черновик от 17 ноя, 21:40» и кнопка «Начать заново». Счётчик символов у textarea при приближении к 2000.
  - `AdviceList`: `{ advice: Advice[]; onApply(id): void; onDismiss(id): void }` — у совета с `suggest` кнопка «Заменить на „…“».
  - `NewExerciseSheet`: `{ exercise: NewExerciseDraft | null; onChange(patch): void; onUseSimilar(): void; onRemove(): void; onClose(): void }` — поля: название, мышцы (через запятую), тип (повторы, вес, время), инвентарь, техника; на основе `Sheet` из `web/src/ui`.
  - `NewRoutineCard`: `{ label: 'Разминка' | 'Заминка'; pick: Extract<RoutinePick, { kind: 'new' }>; onRename; onSec(index, sec); onMove(index, delta); onRemove(index) }` — пометка «новая разминка» текстом, секунды через `ParamStepper` (`unit="с"`, `mode="duration"`).
  - `BuilderReviewView`: `{ draft: BuilderDraft; library: LibraryExercise[]; routines: ParseContext['routines']; saving: boolean; problems: string[]; failure: string | null; onDraft(d: BuilderDraft): void; onSave(): void; onRebuild(): void }` — собирает `WorkoutEditView` (`mode="create"`, `topSlot`=AdviceList, слоты разминки/заминки: `NewRoutineCard` или строка готовой, `newNames` из `draft.newExercises`) и `NewExerciseSheet`; «Пересобрать» сначала показывает в странице подтверждение «Правки формы пропадут» с кнопками «Пересобрать» и «Остаться» (без браузерных диалогов).
- [ ] **Step 1:** Истории с play-функциями: `BuilderInputView` — `Empty` (кнопка недоступна), `TextWarmup` (выбор «Описать свою» показывает textarea), `Restored` (строка восстановления и «Начать заново»), `Building`, `ParseErrors`; `BuilderReviewView` — `WithAdvice` (нажатие «Заменить на „Отжимания на брусьях“» вызывает `onDraft` без нового упражнения), `NewExercise` (открытие панели нового упражнения, поля заполнены), `NewWarmup`, `Problems`, `RebuildConfirm`.
- [ ] **Step 2:** FAIL → реализовать → `npx vitest run --project storybook web/src/features/builder` PASS → коммит `feat(builder): экраны ввода и проверки`.

### Task 12: Страница, маршруты, точки входа

**Files:**
- Create: `web/src/features/builder/BuilderPage/BuilderPage.tsx`, `web/src/features/builder/index.ts`
- Modify: `web/src/app/routes.tsx`, `web/src/features/plan/PlanPage/PlanPage.tsx:166`, `web/src/features/trainer/AthletePlanPage/AthletePlanPage.tsx:65`, `web/src/features/trainer/index.ts` (если экспорт через него)

**Interfaces:**
- Consumes: всё из Tasks 6–11; `useImport(base)` (`web/src/data/hooks.ts`) — `ParseContext`; `useExercises()`; `importActionsFor(base).commit` (`web/src/features/import/api.ts`); `useAuth()`.
- Produces:
  - `export function OwnBuilderPage()` — маршрут `plan/new` под `RequireTrainer`; `export function AthleteBuilderPage()` — маршрут `trainer/athletes/:id/new`. Дата — `?date=YYYY-MM-DD`; без неё или с неверной — назад в план.
  - Поведение: черновик из `loadBuilder(builderKey(...))` при открытии; `saveBuilder` с задержкой 500 мс на каждое изменение ввода, шага и черновика; «Собрать» → `buildWorkout(toRequest(...), ctx, input.main.picked, requestDraft)` → шаг `review`; ответ, пришедший после «Начать заново» или ухода со страницы, игнорируется; «Сохранить» → `draftToCommit` → при проблемах показать их, иначе `commit` → `clearBuilder` → `navigate` в план (`/plan` или `/trainer/athletes/:id/plan`); ошибка 503 — «Сборка недоступна» и ссылка на `/import?date=…` (или `…/import?date=…` ученика).
  - Точки входа: `PlanPage` — `canEnterTrainer(role) ? navigate('/plan/new?date=…') : navigate('/import?date=…')`; `AthletePlanPage` — `navigate(`${base}/new?date=${date}`)`.
- [ ] **Step 1:** Подключить маршруты и точки входа, собрать страницу.
- [ ] **Step 2: Ручная проверка через навык `run`** (локально, `ANTHROPIC_API_KEY` в окружении): тренер → план ученика → пустой день → «Создать тренировку» → описать заминку текстом, в основной части выбрать «Жим лёжа» и описать суперсет → «Собрать» → в форме видны новое упражнение и новая заминка, заметки агента → перезагрузить страницу: черновик восстановлен на шаге проверки → «Сохранить» → тренировка в плане на этот день, в библиотеке новое упражнение и заминка; спортсмен по «Создать тренировку» попадает в импорт; без ключа — «Сборка недоступна». В логе сервера — строка `ai draft` с токенами, при повторной сборке `cacheRead > 0`.
- [ ] **Step 3:** `npm run lint && npm test && npm run build && npm run test:stories` — всё зелёное. Коммит `feat(builder): страница сборки тренировки агентом`. PR 3 по общим правилам.
