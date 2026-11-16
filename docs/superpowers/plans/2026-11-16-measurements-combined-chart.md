# Замеры: общий график и «Икры» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На экране «Замеры» один график со всеми показателями (выбор линий, «Все», «Очистить», тумблер «%» / «кг, см») и новый показатель «Икры».

**Architecture:** Расчёты (срез периода по замерам, изменение от базы, формат) — чистые функции в `web/src/features/measurements/measurements.ts`. Рисование — новый компонент `ui/MultiLineChart` со своей геометрией. `MeasureStatsView` переписывается под множественный выбор; состояние обеих страниц (ученик, тренер) — в общем хуке. «Икры» — новый `MeasurementKind` и миграция таблицы `measurements`.

**Tech Stack:** React + TypeScript, CSS-модули на `tokens.css`, SQLite (better-sqlite3), vitest (`--project unit` и `--project storybook`), Storybook play-тесты, Biome.

**Spec:** `docs/superpowers/specs/2026-11-16-measurements-combined-chart-design.md` — прочитать целиком до начала.

## Global Constraints

- Ветка `feat/measurements-combined-chart` уже создана от `origin/main`, upstream снят. Пушить `git push -u origin feat/measurements-combined-chart`, в main не пушить.
- Один PR, отдельные коммиты по задачам, Conventional Commits 1.0.0, сообщения по-русски, как в истории (`feat(measurements): …`).
- Без новых зависимостей и библиотек графиков.
- Цвета только через токены: новые токены добавить и в `design/tokens.json`, и в `web/src/tokens.css` (генератора в репозитории нет, `tokens.css` правится руками в том же виде).
- Интерфейс: русский, без «!» и эмодзи; число и единица через пробел («−4,3 %», «−4 см», «85,9 кг»); `tabular-nums`; кнопки ≥ 44 px, настоящие `<button>`; состояние не только цветом (галочка + `aria-pressed`); `prefers-reduced-motion`.
- После каждой задачи `npm run build` без ошибок типов; `npm run lint` чистый (исключения только `biome-ignore` с причиной).
- Порядок показателей везде — `MEASUREMENT_FIELDS` / `MEASUREMENT_KINDS`: Вес, Грудь, Талия, Живот, Ягодицы, Бедро, Рука, Икры.

## Review Focus

1. «Месяц», когда за последние 31 день один замер или ни одного: показываются два последних замера, график не пустеет (тест в Task 2).
2. Показатель, не заполненный на выбранную дату (Икры на старых датах): в списке «—» в значении и изменении, без NaN; линия начинается с первого своего значения (тесты в Task 2 и Task 4).
3. Все видимые линии плоские (изменение 0 везде) или линия из одной точки: ось Y не схлопывается, координаты конечны, одиночная точка видна кружком (тесты в Task 3).
4. Выбранная дата после смены периода выходит за число дат: берётся последняя (play-тест в Task 4).
5. Миграция на проде: старая таблица с данными переносится без потерь, повторный запуск ничего не делает, новая схема не трогается (тест в Task 1).

---

### Task 1: Показатель «Икры»

**Files:**
- Modify: `shared/types.ts` (`MeasurementKind`), `shared/measurements.ts` (`MEASUREMENT_KINDS`)
- Modify: `server/db.ts` (схема `measurements`, новая миграция, вызов из `migrate`)
- Modify: `web/src/features/measurements/measurements.ts` (`MEASUREMENT_FIELDS`)
- Modify: `web/src/features/measurements/MeasureFormView/MeasureFormView.stories.tsx` («из 7» → «из 8»)
- Test: `server/measurements.test.ts`, `web/src/features/measurements/measurements.test.ts`

**Interfaces:**
- Produces: `MeasurementKind` включает `'calf'`; `MEASUREMENT_KINDS` = `[..., 'arm', 'calf']`; `MEASUREMENT_FIELDS` последним элементом `{ kind: 'calf', label: 'Икры', unit: 'см', hint: 'Самая широкая часть голени, стоя, вес на обе ноги. Всегда одна и та же нога.' }`; `export function migrateMeasurementKinds(db: Db): void` в `server/db.ts`.

- [ ] **Step 1: Write the failing tests**

В `server/measurements.test.ts`:
- `saveMeasurement` с `values: { calf: 37.5 }` → `{ ok: true }`, `measurementsOf` возвращает `calf: 37.5`.
- `migrateMeasurementKinds` переносит старую таблицу: в `openDb(':memory:')` выполнить `DROP TABLE measurements` и создать её со старым `CHECK (kind IN ('weight','chest','waist','belly','hips','thigh','arm'))` (остальные колонки и ключ как в `server/db.ts`), вставить строку `weight 72` для пользователя `a`; вызвать `migrateMeasurementKinds(db)`; ожидать: строка на месте с тем же `created_at`, `saveMeasurement` с `calf` проходит, `sql` таблицы в `sqlite_master` содержит `'calf'`.
- Повторный `migrateMeasurementKinds(db)` после миграции не меняет число строк и не падает; на свежей `openDb(':memory:')` тоже ничего не делает.

В `web/src/features/measurements/measurements.test.ts`: `MEASUREMENT_FIELDS.map(f => f.kind)` равен `MEASUREMENT_KINDS`, последний — `calf` с подписью «Икры» и единицей «см».

- [ ] **Step 2: Run** `npx vitest run --project unit server/measurements web/src/features/measurements` — Expected: FAIL (тип `calf` неизвестен / CHECK constraint failed / нет `migrateMeasurementKinds`).

- [ ] **Step 3: Implement.** Добавить `'calf'` в тип, `MEASUREMENT_KINDS`, `CHECK` в схеме и `MEASUREMENT_FIELDS`. `migrateMeasurementKinds`: взять `sql` таблицы из `sqlite_master`; если таблицы нет или в `sql` уже есть `'calf'` — выйти; иначе в `db.transaction` создать `measurements_new` с новым `CHECK`, `INSERT INTO measurements_new SELECT user_id, date, kind, value, created_at FROM measurements`, `DROP TABLE measurements; ALTER TABLE measurements_new RENAME TO measurements` (по образцу `migrateSharedExercises`). Вызвать из `migrate(db)`. В сториз формы поправить «из 7» на «из 8».

- [ ] **Step 4: Run** `npm test`, `npx vitest run --project storybook MeasureForm`, `npm run build` — Expected: PASS.

- [ ] **Step 5: Commit** `feat(measurements): показатель «Икры»`.

---

### Task 2: Чистая логика общего графика

**Files:**
- Modify: `web/src/features/measurements/measurements.ts`
- Test: `web/src/features/measurements/measurements.test.ts`

**Interfaces:**
- Consumes: `MeasurementEntry`, `MeasurementKind`, `formatDelta`, тип `Period` (уже есть).
- Produces:
  - `export type ChangeMode = 'percent' | 'units'`
  - `entriesInPeriod(entries: MeasurementEntry[], period: Period, today: string): MeasurementEntry[]` — `'all'`: всё; `'month'`: замеры с датой ≥ today − 30 дней, но не меньше двух последних замеров (если всего ≥ 2). Тот же счёт дней, что в нынешнем `sliceByPeriod`.
  - `changeSeries(entries: MeasurementEntry[], kind: MeasurementKind, mode: ChangeMode): Array<number | null>` — по индексу замера; `null`, где показатель не заполнен; база — первое заполненное значение в `entries`; `'percent'`: `(v − база) / база × 100`, `'units'`: `v − база`. Без округления.
  - `formatChange(d: number, mode: ChangeMode, unit: 'кг' | 'см'): string` — `'percent'`: `` `${formatDelta(d)} %` ``; `'units'`: `` `${formatDelta(d)} ${unit}` ``.
  - `seriesOf` и `sliceByPeriod` удаляются в Task 4 вместе с последним использованием.

- [ ] **Step 1: Write the failing tests** (на данных макета: даты `2026-09-05 … 2026-11-14`, вес `74.2 … 72.0`, `today = '2026-11-14'`):
  - `entriesInPeriod(e6, 'month', '2026-11-14')` → три замера (17 окт, 31 окт, 14 ноя); `'all'` → все шесть.
  - Только старые замеры (`2026-08-01`, `2026-08-15`, `2026-09-01`) и `'month'` → два последних; один замер → он же.
  - `changeSeries` веса в `'units'`: первый `0`, последний ≈ `-2.2` (`toBeCloseTo`); в `'percent'` последний ≈ `-2.965`.
  - Показатель заполнен только в замерах 3 и 5 (из 6): `[null, null, 0, null, x, null]`, база — значение в замере 3.
  - Показатель не заполнен нигде: все `null`; в выходе нет `NaN`.
  - `formatChange(-4.27, 'percent', 'см')` → `'−4,3 %'`; `formatChange(0.01, 'percent', 'см')` → `'0 %'`; `formatChange(-4, 'units', 'см')` → `'−4 см'`; `formatChange(1.5, 'units', 'кг')` → `'+1,5 кг'`.

- [ ] **Step 2: Run** `npx vitest run --project unit web/src/features/measurements` — Expected: FAIL (функций нет).

- [ ] **Step 3: Implement** три функции и тип по сигнатурам выше.

- [ ] **Step 4: Run** тот же тест — PASS; `npm run build`.

- [ ] **Step 5: Commit** `feat(measurements): расчёт изменений для общего графика`.

---

### Task 3: MultiLineChart и цвета линий

**Files:**
- Create: `web/src/ui/MultiLineChart/MultiLineChart.tsx`, `MultiLineChart.module.css`, `MultiLineChart.stories.tsx`, `geometry.ts`, `geometry.test.ts`
- Move: `web/src/ui/LineChart/labels.ts` и `labels.test.ts` → `web/src/ui/MultiLineChart/` (`git mv`; импорт в `LineChart.tsx` поправить, `LineChart` удаляется в Task 4)
- Modify: `web/src/ui/index.ts` (экспорт), `design/tokens.json`, `web/src/tokens.css`

**Interfaces:**
- Produces:
  - Размер в единицах `viewBox`: `SIZE = { w: 326, h: 160, padX: 16, padY: 14 }` — `w` и `padX` как у `LineChart`, потому что `SPAN = 294 / 326` в `labels.ts` на них завязан; если менять, выводить `SPAN` из `SIZE`.
  - Токены `--series-weight #0f766e`, `--series-chest #3b5bdb`, `--series-waist #e8590c`, `--series-belly #c2255c`, `--series-hips #7048e8`, `--series-thigh #2f9e44`, `--series-arm #ae3ec9`, `--series-calf #1098ad` (в `tokens.json` с `usage`: «линия показателя на графике замеров; не текст, всегда с подписью в списке»).
  - `multiChartGeometry(lines: Array<Array<number | null>>, size: { w: number; h: number; padX: number; padY: number }, minSpan: number): { xs: number[]; ys: Array<Array<number | null>>; paths: string[]; zeroY: number; lo: number; hi: number }` — `xs` по числу дат (как в `chartGeometry`, при одной дате — центр); диапазон `[lo, hi]` = min/max всех не-null значений и 0, расширенный до размаха не меньше `minSpan` вокруг середины; `paths[i]` соединяет только не-null точки линии `i` по порядку (`M…L…`), пустая строка, если точек нет.
  - `MultiLineChart({ dates, lines, selected, onSelect, label, minSpan, formatTick, className? })`, где `dates: Array<{ shortLabel: string; ariaLabel: string }>` (от старых к новым), `lines: Array<{ id: string; values: Array<number | null>; color: string; emphasis?: boolean }>` (`color` — `var(--series-…)`), `selected: number`, `onSelect: (i: number) => void`, `label: string` (aria-label группы), `minSpan: number`, `formatTick: (v: number) => string`.

- [ ] **Step 1: Write the failing tests.**
  `geometry.test.ts`: все линии `[0,0,0]` → `hi − lo ≥ minSpan`, все `ys` конечны; линия `[null, 2, null, -3]` → `paths` начинается с `M` и содержит ровно один `L`; линия из одних `null` → `''`; одна дата → `xs = [w/2]`; `zeroY` лежит между `padY` и `h − padY`, когда все значения отрицательные.
  `MultiLineChart.stories.tsx` (`title: 'UI/MultiLineChart'`, контролируемая обёртка как в `LineChart.stories.tsx`): Default (6 дат, 3 линии, одна с `emphasis`), WithGaps (линия с `null`), SinglePoint (линия с одним значением), Flat (все нули), OneDate. Play: кнопок дат столько же, сколько дат; у выбранной `aria-pressed="true"`; клик и Enter по другой вызывают `onSelect(i)`; в SinglePoint на графике есть кружок (`circle`) у этой линии; подпись выбранной даты видна.

- [ ] **Step 2: Run** `npx vitest run --project unit MultiLineChart` и `npx vitest run --project storybook MultiLineChart` — Expected: FAIL.

- [ ] **Step 3: Implement.** SVG `aria-hidden`, контейнер `role="group"` с `label`. Сетка: пунктир на `zeroY`, тонкие линии на `lo`/`hi`, подписи `formatTick(0)`, `formatTick(lo)`, `formatTick(hi)` слева, `--steel` 10–11 px. Линии `stroke: color`, 1.5 px, у `emphasis` 3 px и рисуется последней (поверх). Линия из одной точки — `circle` r 3 того же цвета. Вертикаль выбранной даты `--hairline-strong`. Выбор даты — абсолютно позиционированные `<button>` на всю высоту графика, ширина из `hitWidth`, `aria-pressed`, `aria-label` = `dates[i].ariaLabel`, фокус-кольцо из токенов. Подписи дат под графиком через `visibleLabels`, выбранная жирнее. Высота графика 160 px, ширина гибкая (`viewBox`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`, ResizeObserver для ширины — как в `LineChart`).

- [ ] **Step 4: Run** оба теста — PASS; `npm run build`, `npm run lint`.

- [ ] **Step 5: Commit** `feat(ui): MultiLineChart и цвета линий замеров`.

---

### Task 4: Экран с общим графиком

**Files:**
- Create: `web/src/features/measurements/useMeasureStatsState.ts`
- Modify: `web/src/features/measurements/MeasureStatsView/MeasureStatsView.tsx`, `.module.css`, `.stories.tsx`
- Modify: `web/src/features/measurements/MeasureStatsPage/MeasureStatsPage.tsx`, `web/src/features/trainer/AthleteMeasurementsPage/AthleteMeasurementsPage.tsx`
- Modify: `web/src/features/measurements/measurements.ts` и тест (удалить `seriesOf`, `sliceByPeriod`, реэкспорт `chartGeometry` и их тесты)
- Delete: `web/src/ui/LineChart/`, `web/src/ui/DeltaBadge/` и их экспорты из `web/src/ui/index.ts` — только если после переписывания у них не осталось использований (`git grep`)
- Modify: `MEASUREMENT_FIELDS` — добавить поле `color: string` (`'var(--series-weight)'` и т. д.)

**Interfaces:**
- Consumes: `entriesInPeriod`, `changeSeries`, `formatChange`, `ChangeMode` (Task 2); `MultiLineChart` (Task 3); `SegmentedControl`, `EmptyState`, `Button`, `Text`, `TopBar`, `IconButton`.
- Produces:
  - `useMeasureStatsState(): { visible: MeasurementKind[]; period: Period; mode: ChangeMode; point: number | null; onVisible: (kinds: MeasurementKind[]) => void; onPeriod: (p: Period) => void; onMode: (m: ChangeMode) => void; onPoint: (i: number) => void }` — по умолчанию все `MEASUREMENT_KINDS`, `'all'`, `'percent'`, `null`; смена периода сбрасывает `point` в `null`.
  - `MeasureStatsView` props: `today, entries, visible, period, mode, point, onVisible, onPeriod, onMode, onPoint, onBack?, titled?, onAdd?` (`kind`/`onKind` удаляются). Обе страницы передают `{...useMeasureStatsState()}`.

- [ ] **Step 1: Write stories + play** (`Features/Measurements/MeasureStatsView`, контролируемая обёртка на `useMeasureStatsState`; фикстура `measurementsFixture` без икр):
  - Default: шапка карточки «Изменение с 5 сентября» и «14 ноября»; восемь строк-кнопок, все `aria-pressed="true"`, «Показатели · 8 из 8»; строка «Талия» содержит «80,5 см» и «−4,2 %»; строка «Икры» — «—», без «NaN».
  - Тумблер «кг, см»: строка «Талия» показывает «−3,5 см», «Вес» — «−2,2 кг».
  - «Очистить»: все строки `aria-pressed="false"`, «0 из 8», видна надпись «Выберите показатели в списке», графика нет; «Все» возвращает 8 из 8. Нажатие на «Рука» выключает только её (`7 из 8`).
  - Нажатие на дату «5 сентября»: шапка показывает «5 сентября», «Талия» — «84 см» и «0 %».
  - Выбрать последнюю дату на «Всё время», переключить «Месяц»: шапка «Изменение с 17 октября», выбрана «14 ноября», строка «Талия» — «−1,8 %» (база сдвинулась на 17 октября: 82 → 80,5).
  - WithCalf: фикстура + `calf` только в двух последних замерах: на «5 сентября» «Икры» — «—», на «14 ноября» значение и изменение без NaN.
  - TrainerReadOnly: нет кнопки «Новый замер». Empty: «Замеров пока нет», как сейчас. SingleEntry: один замер, изменения «0 %», без NaN.
  - Narrow: `viewport` 320 px; у строк списка нет горизонтального переполнения (`scrollWidth <= clientWidth`).

- [ ] **Step 2: Run** `npx vitest run --project storybook MeasureStatsView` — Expected: FAIL.

- [ ] **Step 3: Implement** по спеке и макету варианта A: период; карточка (`<section>`, шапка с «Изменение с {formatDateLong(первый замер периода)}» и выбранной датой в `aria-live="polite"`, справа `SegmentedControl` `label="Единицы"`, опции «%» / «кг, см»; `MultiLineChart` с линиями только видимых показателей, у веса `emphasis`, `minSpan` 2, `formatTick`: в `'percent'` — `formatChange(v, 'percent', …)` («−4 %»), в `'units'` — `formatDelta(v)` без единицы, потому что на оси кг и см вместе); при пустом выборе — `<p>` «Выберите показатели в списке» на месте графика. Список: строка «Показатели · N из 8» и кнопки «Все» и «Очистить» (≥ 44 px, `disabled`, когда уже все / уже ни одного); восемь `<button aria-pressed>` с галочкой (видимый ✓ при включении, рамка при выключении), образцом линии цвета `field.color`, названием, значением на выбранную дату (`formatValue` + единица или «—») и `formatChange` (или «—»). Все расчёты (`changeSeries`, значения строк, даты оси) — по `entriesInPeriod(entries, period, today)`, а не по всем замерам. Выбранная дата: `point ?? последняя`, с ограничением по числу замеров в периоде. Удалить ставшие ненужными функции, стили и компоненты (см. Files). Поправить комментарий «список всех семи».

- [ ] **Step 4: Run** `npx vitest run --project storybook`, `npm test`, `npm run lint`, `npm run build` — всё зелёное.

- [ ] **Step 5: Commit** `feat(measurements): общий график всех показателей`.

---

### Task 5: Проверка и PR

Спека и этот план уже закоммичены (`docs(measurements): …`). Неотслеживаемые файлы в `docs/` не трогать и не коммитить.

- [ ] **Step 1: Run** `npm run lint`, `npm test`, `npm run build`, `npm run test:stories` — всё зелёное (как в `ci.yml`).
- [ ] **Step 2: Руками.** `npm run dev` (сервер создаст или смигрирует `data/app.db`). Если войти некем, завести тестового ученика: `npm run create-user -- <email> <пароль> athlete` (тестовые значения записать себе, в чат не выводить). Войти учеником: «Замеры» → «Новый замер» → в форме 8 полей, «Икры» сохраняются → на графике 8 строк, тумблер, «Все»/«Очистить», выбор даты; ширина 320 px. Если есть тренер со связью — вкладка «Замеры» у ученика, без «Новый замер».
- [ ] **Step 3: PR.** Вызвать навык `/mattpocock-skills:pr` для текста PR; `git push -u origin feat/measurements-combined-chart`; `gh pr create --base main`. В описании отметить миграцию таблицы `measurements` (пересоздаётся при старте, данные сохраняются; перед деплоем полезна копия базы по CLAUDE.md). Дождаться зелёного check; не мержить.
