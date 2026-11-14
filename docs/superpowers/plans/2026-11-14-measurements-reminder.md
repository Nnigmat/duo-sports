# Напоминание о замерах на главной: план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Карточка на главной ученика, когда с последнего замера прошло 14 дней и больше или замеров не было.

**Architecture:** Чистая функция `measurementDue` в `shared/measurements.ts`; презентационная `MeasureReminderCard` в `features/today/`; `TodayView` показывает её по необязательному свойству; `TodayPage` для роли `athlete` берёт данные из существующего `useMeasurements()`. Сервер и база не меняются.

**Tech Stack:** React, CSS-модули на токенах, vitest, Storybook (`play`-тесты), Biome.

**Spec:** `docs/superpowers/specs/2026-11-14-measurements-reminder-design.md`

## Global Constraints

- Русский, коротко, без «!» и эмодзи; числа с единицей через пробел; все числа tabular-nums.
- Цвета и шрифты только через `tokens.css`; кнопки не меньше 44 px, настоящие `<button>`/`<a>`; состояние не только цветом.
- Без новых зависимостей; Biome; после каждой задачи `npm run build` без ошибок типов.
- Карточка исчезает только после нового замера: без «Позже», без хранения состояния.
- Коммиты по Conventional Commits; перед коммитом навык `/mattpocock-skills:pr`; в main напрямую не пушить; перед PR lint, test, build, test:stories.
- Порог: 14 дней (константа `MEASUREMENT_INTERVAL_DAYS`).

## Review Focus

- Замеры ровно 14 дней назад: карточка есть; 13 дней назад: нет.
- Замер с датой в будущем (сбой часов): карточки нет, не «минус N дней».
- Записи в произвольном порядке: берётся максимальная дата.
- 1, 2, 5, 11, 21 день: правильное склонение («1 день», «21 день»).
- Тренер и админ: карточки нет, запрос замеров не уходит.
- Ошибка или загрузка `/api/measurements`: главная работает, карточки нет.

## Файлы

- Modify: `shared/measurements.ts`, `shared/measurements.test.ts`: правило срока.
- Create: `web/src/features/today/MeasureReminderCard/MeasureReminderCard.{tsx,module.css,stories.tsx}`.
- Modify: `web/src/features/today/TodayView/TodayView.tsx` (+ story), `web/src/features/today/TodayPage/TodayPage.tsx`.

---

### Task 1: Правило срока

**Files:**
- Modify: `shared/measurements.ts`
- Test: `shared/measurements.test.ts`

**Interfaces:**
- Produces: `MEASUREMENT_INTERVAL_DAYS = 14`; `type MeasurementDue = { due: false } | { due: true; daysSince: number | null }`; `measurementDue(entries: readonly MeasurementEntry[], todayIso: string): MeasurementDue`. `daysSince === null`: замеров не было.

- [ ] **Step 1: Написать падающие тесты** `describe('measurementDue')` в `shared/measurements.test.ts` (сегодня `'2026-11-14'`):
  - `[]` → `{ due: true, daysSince: null }`
  - последний замер `'2026-11-01'` (13 дней) → `{ due: false }`
  - `'2026-10-31'` (14 дней) → `{ due: true, daysSince: 14 }`
  - `'2026-10-01'` → `{ due: true, daysSince: 44 }`
  - записи `['2026-10-01', '2026-11-10', '2026-09-01']` (порядок произвольный) → `{ due: false }`
  - замер `'2026-11-20'` (будущее) → `{ due: false }`
  - переход через границу месяца и года: `'2025-12-31'` при сегодня `'2026-01-14'` → `daysSince: 14`
- [ ] **Step 2: Запустить** `npx vitest run shared/measurements.test.ts`. Ожидается FAIL: `measurementDue` не определена.
- [ ] **Step 3: Реализовать** в `shared/measurements.ts`. Разницу дней считать через `Date.UTC` по разобранным компонентам ISO, чтобы не зависеть от часового пояса и перехода на летнее время. Максимум берётся по строковому сравнению ISO.
- [ ] **Step 4: Запустить** тот же тест. Ожидается PASS.
- [ ] **Step 5: Закоммитить** `feat(measurements): правило срока очередного замера`.

---

### Task 2: Карточка `MeasureReminderCard`

**Files:**
- Create: `web/src/features/today/MeasureReminderCard/MeasureReminderCard.tsx`, `.module.css`, `.stories.tsx`

**Interfaces:**
- Consumes: `plural` из `web/src/features/workout/flow/ru`; `Button`, `SectionHeader`, как в `MissedCard`.
- Produces: `MeasureReminderCard({ daysSince, onMeasure }: { daysSince: number | null; onMeasure: () => void })`.

- [ ] **Step 1: Написать сториз с `play`-тестами** (`title: 'Features/Today/MeasureReminderCard'`, `args: { onMeasure: fn() }`, по образцу `MissedCard.stories.tsx`):
  - `Overdue` (`daysSince: 15`): виден текст «прошло 15 дней», клик по кнопке «Записать» вызывает `onMeasure`.
  - `Never` (`daysSince: null`): виден текст «ещё не было».
  - `OneDay` (`daysSince: 21`): текст «прошло 21 день».
  - Все: заголовок-регион «Замеры» есть.
- [ ] **Step 2: Запустить** `npm run test:stories`. Ожидается FAIL: компонента нет.
- [ ] **Step 3: Реализовать компонент** по образцу `MissedCard`: `<section aria-labelledby>` + `SectionHeader title="Замеры"`, строка «Прошло N дней» / «Замеров ещё не было» (`plural(n, ['день', 'дня', 'дней'])`), `Button variant="primary" compact`. «Записать». Стили: карточка как `.card` у `MissedCard`, только токены; число с `font-variant-numeric: tabular-nums`. Высота кнопки 44 px даёт `compact`.
- [ ] **Step 4: Запустить** `npm run test:stories` и `npm run build`. Ожидается PASS.
- [ ] **Step 5: Закоммитить** `feat(today): карточка напоминания о замерах`.

---

### Task 3: Показ на главной

**Files:**
- Modify: `web/src/features/today/TodayView/TodayView.tsx` (+ `TodayView.stories.tsx`), `web/src/features/today/TodayPage/TodayPage.tsx`

**Interfaces:**
- Consumes: `MeasureReminderCard`; `measurementDue` из `shared/measurements`; `useMeasurements` из `web/src/data/hooks`; `toIso` из `features/plan/plan`.
- Produces: в `TodayViewActions` необязательные `measureReminder?: { daysSince: number | null }` и `onMeasure?: () => void`. Без обоих карточки нет.

- [ ] **Step 1: Написать падающие сториз-тесты** в `TodayView.stories.tsx`:
  - `WithMeasureReminder` (`measureReminder: { daysSince: 15 }`, `onMeasure: fn()`): виден регион «Замеры»; клик «Записать» вызывает `onMeasure`.
  - Существующая базовая сториз: региона «Замеры» нет.
- [ ] **Step 2: Запустить** `npm run test:stories`. Ожидается FAIL для новой сториз.
- [ ] **Step 3: В `TodayView`** выводить `MeasureReminderCard` после `MissedCard`, перед `insights`, только если переданы оба свойства; не пробрасывать их в `TodayHero` (вытащить из `...hero`).
- [ ] **Step 4: В `TodayPage`** добавить обёртку `WithMeasureReminder`: вызывает `useMeasurements()`, считает `measurementDue(data.entries, toIso(new Date()))` и рендерит `TodayContent` с новым необязательным свойством `measureReminder` (передаётся только при `due: true`; пока загрузка или ошибка, не передаётся). `TodayPage` выбирает обёртку при `auth.status === 'in' && auth.user.role === 'athlete'`, иначе `TodayContent` напрямую, так хук не вызывается для тренера и админа. `TodayContent` передаёт в `TodayView` `measureReminder` и `onMeasure={open('/progress/measurements/new')}`.
- [ ] **Step 5: Запустить** `npm run lint`, `npm test`, `npm run build`, `npm run test:stories`. Ожидается всё зелёное.
- [ ] **Step 6: Проверить вручную** (`/run`): ученик без замеров видит карточку; после сохранения замера и возврата на главную карточки нет; под тренером карточки нет и запроса `/api/measurements` нет во вкладке сети.
- [ ] **Step 7: Закоммитить** `feat(today): напоминание о замерах на главной`.

---

## Самопроверка

- Спека: правило (Т1), карточка и текст (Т2), место, роль, поведение при загрузке/ошибке, отсутствие «Позже» (Т3). Не цели соблюдены: сервер не трогаем.
- Имена согласованы: `measurementDue`, `MeasurementDue`, `measureReminder`, `onMeasure`, `daysSince`.
- Review Focus: границы 13/14 дней, будущее, порядок, года/месяцы покрыты в Т1; склонение в Т2; роль и ошибка в Т3 (ручная проверка, шаг 6).
