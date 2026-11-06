/** reps — повторы, weight — вес × повторы, time — мм:сс */
export type ExerciseKind = 'reps' | 'weight' | 'time';

/** Цель-диапазон «18–20»; для одного значения min === max. Для time — секунды. */
export interface Range {
  min: number;
  max: number;
}

/** Позы персонажа: рабочие под упражнения и служебные (старт, отдых, камера, финиш) */
export type Pose =
  | 'stand'
  | 'headroll'
  | 'shoulders'
  | 'dips'
  | 'scissors'
  | 'lunge'
  | 'squat'
  | 'plank'
  | 'rest'
  | 'camera'
  | 'stretch'
  | 'cheer'
  | 'wave';

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** поза персонажа; если не задана, стоит на месте */
  pose?: Pose;
  /** reps/weight — повторы, time — секунды */
  target: Range;
  /** кг, только для kind === 'weight' */
  weight?: number;
}

export interface SetsExercise extends Exercise {
  /** число подходов этого упражнения */
  sets: number;
}

/** Разминка/заминка: упражнения по таймеру подряд */
export interface TimedBlock {
  id: string;
  mode: 'timed';
  title: string;
  /** Пояснение на экране старта: «Повторяйте за персонажем» */
  note?: string;
  exercises: Exercise[];
}

/** Все подходы упражнения, потом следующее */
export interface SetsBlock {
  id: string;
  mode: 'sets';
  title: string;
  exercises: SetsExercise[];
  restSec: number;
  /** номера подходов упражнения (с 1), которые пишем на видео */
  videoRounds: number[];
}

/** По кругу N кругов, отдых после каждого подхода */
export interface CircuitBlock {
  id: string;
  mode: 'circuit';
  title: string;
  exercises: Exercise[];
  rounds: number;
  restSec: number;
  /** номера кругов (с 1), которые пишем на видео */
  videoRounds: number[];
}

export type Block = TimedBlock | SetsBlock | CircuitBlock;

/** План подхода: из него считается строка в облачке и значения в «Изменить» */
export interface SetPlan {
  target: Range;
  weight?: number;
}

/** Комментарий тренера к упражнению или к видео подхода */
export interface CoachComment {
  id: string;
  /** null — комментарий ко всей тренировке */
  exerciseId: string | null;
  exerciseName: string;
  /** ISO-дата */
  createdAt: string;
  text: string;
  /** Спортсмен ещё не открывал */
  isNew: boolean;
  /** Если комментарий к видео: подпись вида «Видео · круг 2, подход 4» */
  video?: { id: string; label: string };
}

/** Описание техники упражнения */
export interface Technique {
  /** Шаги «Как выполнять» */
  instructions: string[];
  /** Частая ошибка */
  mistake?: string;
  /** Ролик чибика под пол спортсмена: /api/demo/<файл>; сервер выбирает его сам */
  demoUrl?: string;
}

/** Тренировка дня: блоки по порядку */
export interface Workout {
  id: string;
  title: string;
  blocks: Block[];
}

/** Ответ GET /api/workouts/:id: тренировка, комментарии тренера и техника по id упражнений тренировки */
export interface WorkoutResponse {
  workout: Workout;
  comments: CoachComment[];
  techniques: Record<string, Technique>;
  /** Пол владельца тренировки: по нему выбирается ролик «чибик стоит»; не задан, пока админ не указал */
  gender?: Gender;
}

/** Роли: аккаунты создаёт админ, саморегистрации нет */
export type Role = 'athlete' | 'trainer' | 'admin';

/** Пол спортсмена: по нему выбирается ролик чибика к упражнению */
export type Gender = 'female' | 'male';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  /** ISO-время последней смены пароля; null, если пароль ещё не менялся */
  passwordChangedAt: string | null;
  /** Не задан, пока админ не указал */
  gender?: Gender;
  /** Имя для показа; не задано, пока пользователь не указал */
  displayName?: string;
}

export const DISPLAY_NAME_MAX = 40;

/** Ответ POST /api/auth/login при отказе */
export type LoginFailure = { error: 'wrong_credentials' } | { error: 'locked'; retryAfterSec: number };

// ── Импорт тренировок ─────────────────────────────────────

/** Группа мышц библиотеки */
export type MuscleGroupId = 'legs' | 'back' | 'chest' | 'arms' | 'core' | 'cardio' | 'other';

/** Ролики чибика к упражнению: имена файлов в data/videos */
export interface ExerciseDemo {
  female?: string;
  male?: string;
}

/** Упражнение библиотеки в том виде, что нужен импорту: найти по названию и показать в справочнике */
export interface LibraryEntry {
  id: string;
  name: string;
  aliases: string[];
  kind: ExerciseKind;
  group: MuscleGroupId;
  muscles: string[];
  /** Как выполнять: строки через \n */
  notes?: string;
  /** Ролики чибика; есть, только если загружен хотя бы один */
  demo?: ExerciseDemo;
}

/**
 * Тело POST /api/exercises и PATCH /api/exercises/:id (в PATCH все поля необязательны).
 * Пустая строка в notes очищает поле. Писать могут только trainer и admin.
 */
export interface ExerciseInput {
  name: string;
  group: MuscleGroupId;
  kind: ExerciseKind;
  muscles: string[];
  aliases: string[];
  /** Как выполнять: шаги через \n */
  notes?: string;
}

/** Ответ GET /api/exercises: общая библиотека */
export interface ExercisesResponse {
  exercises: LibraryEntry[];
}

/** Ответ GET /api/import/context: библиотека и уже стоящий план. Сегодняшний день знает браузер. */
export interface ImportContextResponse {
  library: LibraryEntry[];
  /** Дата → название тренировки в плане */
  mine: Record<string, string>;
}

/** Упражнение, которое импорт создаёт в библиотеке */
export interface CommitExercise {
  /** id из файла; без него сервер придумает свой */
  id?: string;
  name: string;
  aliases: string[];
  muscles: string[];
  kind: ExerciseKind;
  group: MuscleGroupId;
  notes?: string;
}

/** Одна строка блока: упражнение и нагрузка так, как их показывает проверка */
export interface CommitItem {
  name: string;
  value: string;
}

export interface CommitBlock {
  kind: 'warmup' | 'cooldown' | 'exercises';
  heading: string;
  text?: string;
  items: CommitItem[];
}

export interface CommitWorkout {
  /** id из файла: по нему повторный импорт обновляет тренировку */
  id?: string;
  title: string;
  blocks: CommitBlock[];
  /** Те же блоки для экрана тренировки; без них тренировку нельзя запустить */
  structure?: Block[];
}

/**
 * Результат шагов «Проверка» и «План» — то, что нужно записать. Браузер сам разобрал текст и применил
 * выбор пользователя; сервер проверяет форму и пределы, а не повторяет разбор.
 */
export interface ImportCommit {
  exercises: CommitExercise[];
  workouts: CommitWorkout[];
  /** Тренировки в календаре: дата и номер тренировки в workouts */
  entries: Array<{ date: string; workout: number }>;
  /** Даты, где свои тренировки заменяются: «Заменить» на шаге «План» */
  replaceDates: string[];
}

export interface ImportSummary {
  workouts: number;
  inCalendar: number;
  created: number;
  updated: number;
}

/** Ответ POST /api/imports и действий над импортом */
export interface ImportRecord {
  id: number;
  /** ISO-время импорта */
  createdAt: string;
  /** Отменён; null — действует */
  undoneAt: string | null;
  /** До какого времени можно отменить */
  undoUntil: string;
  summary: ImportSummary;
}

// ── План ──────────────────────────────────────────────────

/** Цвет-метка типа тренировки в календаре; всегда рядом с названием */
export type PlanTone = 'primary' | 'teal' | 'amber' | 'slate';

export interface PlanTemplate {
  id: string;
  title: string;
  /** Ориентировочная длительность: оценка по числу упражнений, пока тренировки не знают своей */
  minutes: number;
  tone: PlanTone;
  /** detail: «4 × 8 · 50 кг» */
  exercises: Array<{ name: string; detail: string }>;
}

export type PlanEntryStatus = 'planned' | 'done' | 'skipped' | 'moved';

/** Тренировка, стоящая в конкретный день */
export interface PlanEntry {
  templateId: string;
  status: PlanEntryStatus;
  /** Для status = moved: «31 октября» */
  movedTo?: string;
  /** Тренировка перенесена на этот день с другого: «ср» */
  movedFrom?: string;
  /** Добавлена или скопирована вручную: её можно убрать */
  custom?: boolean;
  /** Названия других тренировок в этот же день («Оставить обе» при импорте) */
  more?: string[];
}

/** Тренировка, перенесённая с одного дня на другой: на старом дне «→ на 6 ноября», на новом «со ср» */
export interface PlanMove {
  templateId: string;
  /** Первоначальный день «2026-11-04»; при повторных переносах не меняется */
  from: string;
  /** День, где тренировка стоит сейчас */
  to: string;
}

/** Ответ GET /api/plan. Сегодня и границы календаря знает браузер. */
export interface PlanResponse {
  templates: PlanTemplate[];
  /** Ключ — дата «2026-10-31» */
  entries: Record<string, PlanEntry>;
  /** Действующие переносы; перенос, чью новую запись убрали из плана, не отдаётся */
  moves: PlanMove[];
}

// ── Выполнение тренировки ─────────────────────────────────

/** Факт подхода: что спортсмен реально сделал. Хранится отдельно от плана. */
export interface SetActual {
  /** Повторы или секунды (у упражнения на время) */
  value: number;
  /** Вес, кг: только у упражнения «вес × повторы» */
  weight?: number;
  /** Отметка «был доп. вес»; нет отметки — поля нет */
  extraWeight?: true;
}

/** Один подход тренировки: что было в плане и сделан ли он */
export interface SessionStepResult {
  exerciseId: string;
  exerciseName: string;
  blockIndex: number;
  /** Круг или номер подхода */
  round: number;
  rounds: number;
  kind: ExerciseKind;
  /** План подхода с учётом правок «Изменить» */
  plan: SetPlan;
  /** Факт; нет у пропущенных подходов, разминки, заминки и у старых Итогов */
  actual?: SetActual;
  completed: boolean;
  /** Видео этого подхода: id из ответа POST /api/videos */
  videoId?: string;
  /** Фактический отдых после подхода, секунд (включая сверх цели); нет у последнего подхода, у пропущенного подхода и в старых итогах; при «Пропустить» на отдыхе это время до нажатия */
  restSec?: number;
}

/** Итог выполненной тренировки: POST /api/workouts/:id/sessions */
export interface SessionResult {
  /** День плана, «2026-11-03» */
  date: string;
  steps: SessionStepResult[];
  videos: number;
  /** Сколько секунд прошло от открытия тренировки до «Завершить», по часам браузера; старые клиенты не шлют */
  durationSec?: number;
}

// ── «Сегодня» ─────────────────────────────────────────────

export interface TodayWorkoutCard {
  id: string;
  title: string;
  /** «сегодня, сб 31 окт» */
  whenLabel: string;
  exerciseCount: number;
  minutes: number;
  /** «Подходами + круг»; пусто, если структура неизвестна */
  modeLabel: string;
  muscles: string[];
  exercises: Array<{ name: string; plan: string }>;
}

export interface TodayDay {
  weekday: string;
  /** Число месяца для подписи; полная дата — в iso */
  date: string;
  /** Дата дня вида 2026-11-03: по ней переносим тренировку */
  iso: string;
  status: 'done' | 'planned' | 'missed' | 'moved' | 'rest';
  today?: boolean;
  caption?: string;
  fullLabel: string;
  title: string;
  meta: string;
  actionLabel?: string;
}

/** Невыполненная тренировка с прошлых недель: её можно перенести вперёд */
export interface TodayMissed {
  /** Дата, на которую она стояла: «2026-10-30» */
  iso: string;
  /** «Пятница, 30 октября» */
  label: string;
  title: string;
}

/** Ответ GET /api/today?date=2026-11-03. Дату знает браузер. Минуты и рекорды пока не считаются: данных для них нет. */
export interface TodayResponse {
  dateLabel: string;
  userName: string;
  state:
    | { kind: 'workout'; workout: TodayWorkoutCard }
    | { kind: 'rest'; next: { whenLabel: string; title: string; minutes: number } | null }
    | { kind: 'done'; summary: { title: string; volumeKg: number; minutes?: number; records?: number } };
  week: TodayDay[];
  /** Пропущенное до начала этой недели, свежие первыми; пропуски текущей недели видны в week */
  missed: TodayMissed[];
  streakWeeks: number;
  /** Пауза, которая идёт сегодня или начнётся позже; нет — если плана на паузе нет */
  pause?: TodayPause;
  /** Непрочитанные уведомления: точка на колокольчике */
  unread: number;
  /** Последний нескрытый разбор тренера */
  reviewNotice?: ReviewNotice;
  awaitingReview?: AwaitingReview;
}

/** Пауза плана: даты включительно */
export interface TodayPause {
  from: string;
  to: string;
  /** «до 9 ноября» */
  label: string;
}

// ── Разбор тренировки ─────────────────────────────────────

/** Подход в разборе: label — «80 кг × 5», n — номер подхода в упражнении */
export interface ReviewSet {
  n: number;
  label: string;
  completed: boolean;
  videoId?: string;
  videoDurationSec?: number;
}

/** Комментарий в разборе; кто «ты», решает экран по роли зрителя */
export interface ReviewComment {
  id: string;
  author: 'trainer' | 'athlete';
  text: string;
  /** Секунда видео; null — комментарий не привязан к моменту */
  timecodeSec: number | null;
  videoId: string | null;
  createdAt: string;
  /** Автор — другая сторона, и зритель ещё не открывал */
  isNew: boolean;
}

export interface ReviewExercise {
  /** Ключ группы подходов: блок и id упражнения из структуры */
  id: string;
  name: string;
  /** slug упражнения в библиотеке: по нему пишется ответ; null — упражнения нет в библиотеке */
  slug: string | null;
  sets: ReviewSet[];
  /** Заметка спортсмена к упражнению, написанная до разбора («Ты написал») */
  note: string | null;
  /** Комментарии тренера и ответы по порядку времени */
  thread: ReviewComment[];
  newCount: number;
}

/** Подсказки тренера к следующему занятию */
export interface ReviewHints {
  date: string;
  workoutId: number;
  title: string;
  hints: Array<{ exerciseName: string; detail?: string; text: string }>;
}

/** Ответ GET /api/sessions/:id/review?date=: выполненная тренировка с комментариями. date — сегодня у клиента. */
export interface SessionReviewResponse {
  sessionId: number;
  athleteId: number;
  title: string;
  /** День тренировки «2026-10-31» */
  date: string;
  durationSec: number | null;
  volumeKg: number;
  /** ISO-время разбора; null — ждёт разбора */
  reviewedAt: string | null;
  /** Сколько комментариев написал тренер */
  trainerCommentCount: number;
  exercises: ReviewExercise[];
  /** Комментарии ко всей тренировке */
  general: ReviewComment[];
  /** Только для спортсмена; null, если подсказок нет */
  hints: ReviewHints | null;
}

/** Ответ GET /api/videos/:id/review: видео и комментарии к нему */
export interface VideoReviewResponse {
  /** Чьё видео: ему адресуются ответы */
  athleteId: number;
  video: { id: string; durationSec: number; exerciseName: string; /** «Подход 4 · 80 кг × 5» */ label: string; sessionId: number | null };
  comments: ReviewComment[];
}

/** Карточка разбора на «Сегодня» */
export interface ReviewNotice {
  notificationId: number;
  sessionId: number;
  title: string;
  reviewedAt: string;
  commentCount: number;
  videoCommentCount: number;
  preview: { exerciseName: string; timecodeSec: number | null; text: string } | null;
}

/** «Видео отправлены, тренер ещё не посмотрел» */
export interface AwaitingReview {
  sessionId: number;
  title: string;
  /** «сегодня», «вчера» или «31 окт» */
  whenLabel: string;
  videos: number;
}

// ── Кабинет тренера ───────────────────────────────────────

export type AthleteStatus = 'review' | 'inactive' | 'ok';

/** Строка списка учеников */
export interface AthleteRow {
  id: number;
  name: string;
  email: string;
  /** Цель, которую задал тренер: «Сила»; null — не задана */
  goal: string | null;
  lastSession: { date: string; title: string } | null;
  /** Тренировок за последние 7 дней и сколько стояло в плане */
  done7: number;
  planned7: number;
  /** review — есть неразобранные тренировки с видео или с заметками; inactive — 7 дней без тренировок; иначе ok */
  status: AthleteStatus;
  waitingSessions: number;
  waitingVideos: number;
  /** Разобранные тренировки, где ученик оставил комментарий, которого тренер ещё не видел */
  repliedSessions: number;
  /** Дней с последней тренировки; null — тренировок не было */
  daysSinceLast: number | null;
}

/** Ответ GET /api/trainer/athletes?date=&filter=&q= */
export interface AthleteListResponse {
  athletes: AthleteRow[];
  /** Сколько учеников в каждом фильтре, не зависит от выбранного фильтра и поиска */
  counts: Record<'all' | AthleteStatus, number>;
}

/** Запись плана ученика для тренера: «Запланирована» или «Перенесена» (серый пунктир на старом дне) */
export interface TrainerPlanItem {
  kind: 'planned' | 'moved';
  date: string;
  workoutId: number;
  title: string;
  exerciseCount: number;
  /** kind = planned: перенесена сюда с этого дня */
  movedFrom?: string;
  /** kind = moved: теперь стоит на этом дне */
  movedTo?: string;
}

export interface TrainerHistoryItem {
  sessionId: number;
  date: string;
  title: string;
  durationSec: number | null;
  volumeKg: number;
  setsDone: number;
  videos: number;
  /** ISO-время разбора; null — ждёт разбора */
  reviewedAt: string | null;
  /** Сколько написал ученик, чего тренер ещё не открывал */
  newFromAthlete: number;
  /** Тренировка перенесена на этот день с этого */
  movedFrom?: string;
}

/** Ответ GET /api/trainer/athletes/:id/sessions?date= */
export interface AthleteSessionsResponse {
  planned: TrainerPlanItem[];
  history: TrainerHistoryItem[];
}

/** Прошлый комментарий тренера к упражнению ученика */
export interface ExerciseCommentItem {
  id: string;
  /** День тренировки, а без неё — день комментария */
  date: string;
  timecodeSec: number | null;
  text: string;
}

export interface ProgressRecord {
  exerciseName: string;
  /** «90 кг × 5», «18 повт», «1:45» */
  label: string;
  /** День, когда рекорд поставлен */
  date: string;
}

/** Ответ GET /api/trainer/athletes/:id/progress?date= */
export interface AthleteProgressResponse {
  /** Тренировки за последние 28 дней и сколько стояло в плане */
  regularity: { done: number; planned: number };
  /** Объём в тоннах по неделям с понедельника, старые первыми, последняя — текущая */
  volume: Array<{ weekStart: string; tons: number }>;
  /** Лучшие результаты по упражнениям, свежие первыми */
  records: ProgressRecord[];
  /** Сколько раз за последние 30 дней улучшен прежний рекорд */
  recordsMonth: number;
}

// ── Перенос тренировки ──

export type ScheduleTarget = { date: string; weekday: string; day: string; busy?: string };
export type ScheduleResponse = {
  /** Дата, с которой переносим */
  from: string;
  workout: { id: string; title: string; whenLabel: string };
  /** Ближайший свободный (иначе ближайший) день этой недели; null, если неделя закончилась */
  sameWeek: (ScheduleTarget & { relative?: string }) | null;
  nextWeek: { rangeLabel: string; days: ScheduleTarget[] };
  /** Названия тренировок по датам плана: нужны, чтобы показать занятые дни любой недели */
  busy: Record<string, string>;
};

// ── «Достижения» ──────────────────────────────────────────

export interface AchievementItem {
  id: string;
  name: string;
  /** Имя иконки из web/src/ui/Icon */
  icon: string;
  description: string;
  /** 0 — не получена, 1 — бронза, 2 — серебро, 3 — золото */
  tier: 0 | 1 | 2 | 3;
  /** «26 окт»: даты получения уровней по порядку, длина равна tier */
  earnedDates: string[];
  secret?: boolean;
  streak?: boolean;
  levels?: [number, number, number];
  levelLabels?: [string, string, string];
  current?: number;
  unit?: string;
}

export interface AchievementsResponse {
  categories: Array<{ id: string; name: string; note?: string; items: AchievementItem[] }>;
}
