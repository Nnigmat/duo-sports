/** Содержимое страницы «Формат импорта»; из макета «Импорт · Описание формата». */

export interface CodeLine {
  n: number;
  code: string;
  /** «# комментарий» без отступа: хвост строки или строка-комментарий целиком */
  comment: string;
}

/** Делит строки YAML на код и комментарий; строка, начинающаяся с «#», — комментарий целиком. */
export function splitCode(lines: string[]): CodeLine[] {
  return lines.map((s, i) => {
    if (s.trim().startsWith('#')) return { n: i + 1, code: s.slice(0, s.indexOf('#')), comment: s.trim() };
    const k = s.indexOf('  #');
    if (k >= 0) return { n: i + 1, code: s.slice(0, k).trimEnd(), comment: s.slice(k).trim() };
    return { n: i + 1, code: s, comment: '' };
  });
}

/** Исходный текст примера: его копирует кнопка */
export const joinCode = (lines: string[]): string => `${lines.join('\n')}\n`;

export interface FieldRow {
  field: string;
  value: string;
  description: string;
  /** required — «обязательно», recommended — «рекомендуется» или свой текст */
  flag?: { kind: 'required' } | { kind: 'recommended'; label?: string };
}

const req: FieldRow['flag'] = { kind: 'required' };
const rec = (label?: string): FieldRow['flag'] => ({ kind: 'recommended', label });
const row = (field: string, value: string, description: string, flag?: FieldRow['flag']): FieldRow => ({ field, value, description, flag });

export const EXAMPLE = [
  'version: 1',
  'exercises:                      # новые упражнения, необязательно',
  '  - id: reverse-pushup',
  '    name: Обратные отжимания от лавочки',
  '    muscles: [трицепс]',
  '    measure: reps',
  'workouts:',
  '  - id: w02-tue                 # ключ для повторного импорта',
  '    date: 2026-11-03',
  '    title: Трицепс, пресс, ноги',
  '    blocks:',
  '      - type: warmup',
  '        time: 5-7m',
  '        text: Разогреться любым способом',
  '      - type: circuit',
  '        rounds: 3',
  '        exercises:',
  '          - { exercise_id: reverse-pushup, reps: 20-24 }',
  '          - { name: Подтягивание колен в висе, reps: max }',
  '          - { name: Боковая планка, time: 30s, per_side: true }',
  '      - type: cooldown',
  '        text: Растяжка, расслабление спины',
];

export const TOP_FIELDS: FieldRow[] = [
  row('version', '1', 'Версия формата. Сейчас всегда 1.', req),
  row('units', 'kg | lb', 'Единицы веса. По умолчанию — как в профиле.'),
  row('exercises', 'список', 'Новые упражнения с видео и подсказками. Создадим только те, что вы отметите на проверке.'),
  row('routines', 'список', 'Наборы упражнений для разминки и заминки: описываются один раз, в блоках подключаются через routine.'),
  row('workouts', 'список', 'Тренировки, хотя бы одна. С date — сразу в календарь.', req),
  row('plan', 'объект', 'Повтор по дням недели — для тренировок без date.'),
];

export const WORKOUT_FIELDS: FieldRow[] = [
  row('id', 'w02-tue', 'Латиница, цифры и дефис. По нему повторный импорт обновит тренировку, а не создаст копию.', rec()),
  row('date', '2026-11-03', 'День в календаре. Без даты тренировка сохранится как шаблон.'),
  row('title', 'Трицепс, пресс', 'Название в приложении.', req),
  row('tags', '[ягодицы, кор]', 'Группы мышц — показываются чипами на карточке.'),
  row('duration', '50m, 1h10m', 'Примерная длительность. Без неё посчитаем по подходам и отдыху.'),
  row('notes', 'текст', 'Заметка, видна перед началом тренировки.'),
  row('blocks', 'список', 'Блоки упражнений по порядку.', req),
];

export interface BlockType {
  type: string;
  title: string;
  description: string;
  code: string[];
}

export const BLOCK_TYPES: BlockType[] = [
  { type: 'sets', title: 'Подходами', description: 'Все подходы одного упражнения, затем следующее.', code: ['- type: sets', '  exercises:', '    - { name: Жим лёжа, do: "4x8 @ 60" }', '    - { name: Махи в стороны, do: "3x15 @ 6" }'] },
  { type: 'circuit', title: 'Круг', description: 'Упражнения подряд, отдых после круга. Повторить rounds раз.', code: ['- type: circuit', '  rounds: 3', '  rest: 90s                # после круга', '  exercises: [ … ]'] },
  { type: 'superset', title: 'Суперсет', description: '2–3 упражнения без отдыха между ними.', code: ['- type: superset', '  rounds: 3', '  rest: 60s', '  exercises: [ … ]'] },
  { type: 'warmup | cooldown', title: 'Разминка и заминка', description: 'Свободный текст и время — когда тренер пишет «любым способом», а не список упражнений.', code: ['- type: warmup', '  time: 5-7m', '  text: Скакалка, ОРУ ~10 мин'] },
  { type: 'warmup | cooldown + routine', title: 'Набор упражнений', description: 'Упражнения на время с видео, отсчётом и сигналами. Набор описывается в routines и подключается по id.', code: ['- type: warmup', '  routine: neck-shoulders'] },
];

export const SHORT_FORMS: Array<{ code: string; description: string }> = [
  { code: '4x8 @ 75', description: '4 подхода по 8 повторов с 75 кг' },
  { code: '3x12', description: '3 подхода по 12, свой вес' },
  { code: '3x8-12 @ 60', description: 'Диапазон повторов — для двойной прогрессии' },
  { code: '5x5 @ 225lb', description: 'Единица указана явно — перекрывает units' },
];

export const EXERCISE_FIELDS: FieldRow[] = [
  row('name', 'Жим лёжа', 'Название из библиотеки или вариант из aliases. Незнакомое — предложим создать.', rec('или exercise_id')),
  row('exercise_id', 'bench-press', 'Точная ссылка на упражнение из библиотеки.'),
  row('do', '"4x8 @ 75"', 'Короткая запись нагрузки. Заменяет sets, reps и weight.'),
  row('sets', '4 или список', 'Число подходов. Списком — если у подходов разная нагрузка.'),
  row('reps', '8, "8-12", max', 'Повторы в подходе. max — «сколько получится», запишете факт после подхода.'),
  row('per_side', 'true', 'Нагрузка на каждую ногу, руку или сторону.'),
  row('weight', '75, 75kg', 'Рабочий вес.'),
  row('time', '45s, 1:30', 'Для упражнений на время.'),
  row('distance', '500m, 2km', 'Для кардио.'),
  row('rest', '90s', 'Отдых между подходами. По умолчанию — из настроек.'),
  row('notes', 'текст', 'Подсказка именно для этой тренировки: «не меньше, чем в прошлый раз».'),
  row('rpe', '8', 'Ощущаемая тяжесть от 1 до 10.'),
];

export const PYRAMID = [
  '- name: Жим ногами',
  '  sets:',
  '    - { reps: 15, weight: 60, warmup: true }',
  '    - { reps: 12, weight: 100 }',
  '    - { reps: 10, weight: 120 }',
  '    - { reps: 8,  weight: 140 }',
];

export const NEW_EXERCISE_FIELDS: FieldRow[] = [
  row('id', 'reverse-pushup', 'Ключ для exercise_id в тренировках.', req),
  row('name', 'Обратные отжимания', 'Название во вкладке «Упражнения».', req),
  row('muscles', '[трицепс]', 'Группы мышц. Без них спросим на проверке.', rec()),
  row('measure', 'reps', 'Как считать: weight, reps, time или distance. По умолчанию reps.'),
  row('notes', 'текст', 'Подсказки по технике, видны в каждой тренировке.'),
  row('aliases', '[обратка]', 'Другие названия — по ним тоже найдём.'),
];

export const ROUTINE_EXAMPLE = [
  'version: 1',
  'routines:',
  '  - id: neck-shoulders',
  '    title: Шея и плечи',
  '    exercises:',
  '      - { name: Вращение головой, time: 30s, per_side: true }',
  '      - { name: Вращение плечами, time: 20s, per_side: true, sides: [вперёд, назад] }',
  '  - id: back-stretch',
  '    title: Растяжка спины',
  '    exercises:',
  '      - { name: Наклон к ногам, time: 45s }',
  'workouts:',
  '  - title: Верх тела',
  '    date: 2026-11-03',
  '    blocks:',
  '      - { type: warmup, routine: neck-shoulders }',
  '      - type: circuit',
  '        rounds: 2',
  '        exercises:',
  '          - { name: Планка, time: 30s }',
  '      - { type: cooldown, routine: back-stretch }',
];

export const ROUTINE_FIELDS: FieldRow[] = [
  row('id', 'neck-shoulders', 'Латиница, цифры и дефис. По нему блок подключает набор: routine: neck-shoulders.', req),
  row('title', 'Шея и плечи', 'Название набора для себя.'),
  row('exercises', 'список', 'Упражнения по порядку, хотя бы одно. Смена по таймеру, без пауз.', req),
  row('time', '30s, 1:30', 'У каждого упражнения набора, на одну сторону.', req),
  row('per_side', 'true', 'Упражнение в две стороны: два шага подряд, подписи «вправо» и «влево».'),
  row('sides', '[вперёд, назад]', 'Свои подписи двух сторон. Включает стороны и без per_side.'),
];

export const UNITS: Array<{ title: string; values: string[] }> = [
  { title: 'Время', values: ['45', '45s', '2m', '1h10m', '1:30'] },
  { title: 'Вес', values: ['75', '75kg', '165lb'] },
  { title: 'Дистанция', values: ['500m', '2km', '1.5mi'] },
];

export const PLAN_FIELDS: FieldRow[] = [
  row('start', '2026-11-02', 'Первый день. По умолчанию — ближайший понедельник; дату можно сменить на шаге «План».'),
  row('weeks', '4', 'Сколько недель повторять расписание, от 1 до 52.', req),
  row('schedule', 'mon: legs-a', 'День недели (mon…sun) → id тренировки. Не указанный день — отдых.', req),
];

export const ALTERNATING = [
  'schedule:',
  '  - { mon: upper-a, wed: legs-a, fri: upper-b }   # неделя 1, 3…',
  '  - { mon: upper-b, wed: legs-b, fri: upper-a }   # неделя 2, 4…',
];

export const REIMPORT: Array<{ title: string; text: string }> = [
  { title: 'Тот же id — обновление', text: 'На проверке можно выбрать: обновить, создать копию или пропустить.' },
  { title: 'Без id — возможный дубликат', text: 'Если название совпало с вашей тренировкой, спросим, что делать.' },
  { title: 'История не меняется', text: 'Выполненные тренировки и рекорды остаются как были — обновятся только будущие.' },
];

export const LIMITS = 'До 1 МБ текста и до 500 тренировок за раз. Незнакомое поле — предупреждение, а не ошибка: тренировка импортируется без него.';

export const ERRORS: Array<{ message: string; fix: string }> = [
  { message: 'reps должно быть числом или диапазоном', fix: 'Пишите 10 или "8-12" — без слов и единиц.' },
  { message: 'Неверный отступ в строке 14', fix: 'YAML чувствителен к пробелам: отступ — 2 пробела, без табов.' },
  { message: 'id повторяется: legs-a', fix: 'У каждой тренировки в тексте свой id.' },
  { message: 'В schedule неизвестная тренировка: upper-c', fix: 'В плане можно ссылаться только на id из workouts или на сохранённые тренировки.' },
  { message: 'У упражнения нет нагрузки', fix: 'Добавьте do, reps, time или distance.' },
  { message: 'Неизвестный exercise_id: reverse-pushups', fix: 'Исправьте опечатку или опишите упражнение в exercises.' },
];

/** Содержание страницы; id — якоря разделов */
export const SECTIONS = [
  { id: 'example', title: 'Пример' },
  { id: 'structure', title: 'Структура' },
  { id: 'workout', title: 'Тренировка' },
  { id: 'blocks', title: 'Блоки' },
  { id: 'exercise', title: 'Упражнение' },
  { id: 'new-exercises', title: 'Новые упражнения' },
  { id: 'routines', title: 'Наборы' },
  { id: 'units', title: 'Единицы' },
  { id: 'plan', title: 'Даты и повтор' },
  { id: 'reimport', title: 'Повторный импорт' },
  { id: 'errors', title: 'Ошибки' },
] as const;
