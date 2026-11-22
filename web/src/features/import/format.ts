/** Содержимое страницы «Формат импорта»; из макета «Импорт · Описание формата». */

import { V1_FIELD_HINTS } from './v2';

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


/** Пример страницы: разбирается как есть; id библиотеки и набор cooldown-common — те, что есть в приложении */
export const EXAMPLE = [
  'version: 2',
  'exercises:                      # новые упражнения, необязательно',
  '  - { id: band-pullup, name: Подтягивания с резинкой, measure: weight, muscles: [спина], equipment: [Турник, Резинка] }',
  'routines:                       # новые наборы, необязательно',
  '  - id: warmup-wrists',
  '    title: Разминка с запястьями',
  '    note: Повторяйте за персонажем',
  '    exercises:',
  '      - { exercise_id: wrist-mobilization, time_sec: 30 }',
  '      - { exercise_id: open-book, time_sec: 15, sides: [влево, вправо] }',
  'workouts:',
  '  - title: Перепроверка старта',
  '    date: 2026-11-20',
  '    notes: Рабочих подходов отжиманий сегодня нет',
  '    blocks:',
  '      - { type: warmup, routine: warmup-wrists }',
  '      - type: sets',
  '        exercises:',
  '          - { exercise_id: pushup-handles, sets: 1, reps: max, rest_sec: 180 }',
  '          - { exercise_id: dead-hang, sets: 1, time_sec: max, rest_sec: 180 }',
  '          - { exercise_id: pullup, sets: 1, reps: max, rest_sec: 180 }',
  '          - { exercise_id: hanging-knee-raise, sets: 1, reps: 10 }',
  '      - type: note',
  '        title: Тест большого пальца',
  '        text: Большой палец в кулак, кисть плавно наклонить к мизинцу. Есть ли резкая боль у основания пальца и насколько сильная.',
  '      - type: sets',
  '        exercises:',
  '          - { exercise_id: band-pullup, sets: 3, reps: 4, weight_kg: 35, rest_sec: 180, notes: Оба колена в петле. Полная амплитуда. }',
  '      - type: circuit',
  '        rounds: 2',
  '        rest_sec: 90',
  '        exercises:',
  '          - { exercise_id: db-curl-seated, reps: 10-12, weight_kg: 8, notes: Локоть упирается в бедро }',
  '          - { exercise_id: lunge, reps: 10, sides: [левая нога, правая нога] }',
  '      - { type: cooldown, routine: cooldown-common }',
];

export const TOP_FIELDS: FieldRow[] = [
  row('version', '2', 'Версия формата.', req),
  row('exercises', 'список', 'Новые упражнения с видео и подсказками. Создадим только те, что вы отметите на проверке.'),
  row('routines', 'список', 'Разминки и заминки из файла: описываются один раз, сохраняются в библиотеку разминок и подключаются к тренировкам через routine.'),
  row('workouts', 'список', 'Тренировки, хотя бы одна. С date — сразу в календарь.', req),
  row('plan', 'объект', 'Повтор по дням недели — для тренировок без date.'),
];

export const WORKOUT_FIELDS: FieldRow[] = [
  row('id', 'w02-tue', 'Латиница, цифры и дефис. По нему повторный импорт обновит тренировку, а не создаст копию.', rec()),
  row('date', '2026-11-03', 'День в календаре. Без даты тренировка сохранится как шаблон.'),
  row('title', 'Трицепс, пресс', 'Название в приложении.', req),
  row('notes', 'текст', 'Заметка к тренировке, видна на экране старта.'),
  row('blocks', 'список', 'Блоки по порядку.', req),
];

export interface BlockType {
  type: string;
  title: string;
  description: string;
  code: string[];
}

export const BLOCK_TYPES: BlockType[] = [
  { type: 'sets', title: 'Подходами', description: 'Все подходы одного упражнения, затем следующее. Отдых после каждого подхода задаёт rest_sec упражнения, по умолчанию 90 с.', code: ['- type: sets', '  exercises:', '    - { exercise_id: pullup, sets: 3, reps: 8, rest_sec: 120 }', '    - { exercise_id: db-curl-seated, sets: 3, reps: 10-12, weight_kg: 8 }'] },
  { type: 'circuit', title: 'Круг', description: 'Упражнения подряд, повторить rounds раз (по умолчанию 1). Отдых rest_sec, по умолчанию 60 с. По умолчанию он только после круга: между упражнениями отдыха нет. rest_after: exercise — отдых rest_sec после каждого упражнения: 1, отдых, 2, отдых, 3, отдых, снова 1.', code: ['- type: circuit', '  rounds: 3', '  rest_sec: 90', '  exercises:', '    - { exercise_id: lunge, reps: 10, sides: [левая нога, правая нога] }', '    - { exercise_id: plank, time_sec: 30 }', '', '- type: circuit', '  rounds: 3', '  rest_sec: 45', '  rest_after: exercise', '  exercises:', '    - { exercise_id: pullup, reps: 8 }', '    - { exercise_id: lunge, reps: 10, sides: [левая нога, правая нога] }'] },
  { type: 'timed', title: 'По таймеру', description: 'Упражнения на время в основной части: идут сами, по очереди. Только exercise_id, time_sec и sides; max здесь нельзя.', code: ['- type: timed', '  title: Планки', '  exercises:', '    - { exercise_id: plank, time_sec: 45 }'] },
  { type: 'warmup | cooldown', title: 'Разминка и заминка', description: 'Только routine: id набора из routines файла или из библиотеки разминок. Упражнений, time и text в самом блоке нет. В тренировке нужен хотя бы один другой блок.', code: ['- type: warmup', '  routine: warmup-common'] },
  { type: 'note', title: 'Заметка', description: 'Шаг без упражнений: заголовок и текст. На экране тренировки есть поле «Ответ»; ответ видит тренер.', code: ['- type: note', '  title: Тест большого пальца', '  text: Большой палец в кулак, кисть наклонить к мизинцу. Есть ли резкая боль.'] },
];

export const EXERCISE_FIELDS: FieldRow[] = [
  row('exercise_id', 'pullup', 'Единственный способ сослаться на упражнение: id из библиотеки или из exercises файла. Поиска по названию нет.', req),
  row('sets', '4', 'Число подходов, целое от 1; по умолчанию 1. Только в sets: в circuit подходы задаёт rounds.'),
  row('reps', '8, "8-12", max', 'Повторы. max — «сколько получится», запишете факт после подхода. Нужно ровно одно из reps и time_sec.'),
  row('time_sec', '45, max', 'Секунды, целое больше 0. max — секундомер: «Старт», «Стоп», время запишется в результат. В timed max нельзя.'),
  row('weight_kg', '75', 'Вес в кг, число от 0. Только вместе с reps.'),
  row('rest_sec', '90', 'Отдых после каждого подхода этого упражнения, по умолчанию 90. Только в sets: у упражнения круга это ошибка.'),
  row('sides', '[влево, вправо]', 'Ровно две подписи: нагрузка на каждую сторону. На экране «10 на сторону», шаг не делится.'),
  row('notes', 'текст', 'Подсказка именно для этой тренировки: «не меньше, чем в прошлый раз».'),
];

/** Пирамида: несколько строк одного упражнения; редактор тоже пишет её так */
export const PYRAMID = [
  '- type: sets',
  '  exercises:',
  '    - { exercise_id: bench-press, sets: 1, reps: 15, weight_kg: 60 }',
  '    - { exercise_id: bench-press, sets: 1, reps: 12, weight_kg: 100 }',
  '    - { exercise_id: bench-press, sets: 1, reps: 10, weight_kg: 120 }',
  '    - { exercise_id: bench-press, sets: 1, reps: 8, weight_kg: 140 }',
];

export const NEW_EXERCISE_FIELDS: FieldRow[] = [
  row('id', 'reverse-pushup', 'Ключ для exercise_id в тренировках.', req),
  row('name', 'Обратные отжимания', 'Название во вкладке «Упражнения».', req),
  row('muscles', '[трицепс]', 'Группы мышц. Без них спросим на проверке.', rec()),
  row('measure', 'reps', 'Как считать: weight, reps, time или distance. По умолчанию reps.'),
  row('video', 'ссылка', 'Видео с техникой.'),
  row('notes', 'текст', 'Подсказки по технике, видны в каждой тренировке.'),
  row('equipment', '[скамья, 2 гантели]', 'Инвентарь: по нему на старте тренировки покажем список «Инвентарь». Гантель — одна, 2 гантели — пара.'),
  row('aliases', '[обратка]', 'Другие названия.'),
];

export const ROUTINE_EXAMPLE = [
  'version: 2',
  'routines:',
  '  - id: neck-shoulders',
  '    title: Шея и плечи',
  '    note: Повторяйте за персонажем',
  '    exercises:',
  '      - { exercise_id: wrist-mobilization, time_sec: 30 }',
  '      - { exercise_id: open-book, time_sec: 20, sides: [вперёд, назад] }',
  '  - id: back-stretch',
  '    title: Растяжка спины',
  '    exercises:',
  '      - { exercise_id: lunge, time_sec: 45 }',
  'workouts:',
  '  - title: Верх тела',
  '    date: 2026-11-03',
  '    blocks:',
  '      - { type: warmup, routine: neck-shoulders }',
  '      - type: circuit',
  '        rounds: 2',
  '        exercises:',
  '          - { exercise_id: plank, time_sec: 30 }',
  '      - { type: cooldown, routine: back-stretch }',
];

export const ROUTINE_FIELDS: FieldRow[] = [
  row('id', 'neck-shoulders', 'Латиница, цифры и дефис. По нему блок подключает набор: routine: neck-shoulders. Такой же id есть у разминки в библиотеке — она не перезаписывается.', req),
  row('title', 'Шея и плечи', 'Название набора для себя.'),
  row('note', 'Повторяйте за персонажем', 'Подсказка к набору.'),
  row('exercises', 'список', 'Упражнения по порядку, хотя бы одно. Смена по таймеру, без пауз.', req),
  row('exercise_id', 'open-book', 'У каждого упражнения набора: любое упражнение библиотеки или файла.', req),
  row('time_sec', '30', 'Секунды на одну сторону, целое больше 0.', req),
  row('sides', '[влево, вправо]', 'Ровно две подписи сторон: два шага подряд.'),
];

export const UNITS: Array<{ title: string; values: string[] }> = [
  { title: 'Время, time_sec', values: ['45', '90', 'max'] },
  { title: 'Вес, weight_kg', values: ['0', '8', '72.5'] },
  { title: 'Повторы, reps', values: ['10', '"8-12"', 'max'] },
  { title: 'Отдых, rest_sec', values: ['60', '180'] },
];

export const PLAN_FIELDS: FieldRow[] = [
  row('start', '2026-11-02', 'Первый день. По умолчанию — ближайший понедельник; дату можно сменить на шаге «План».'),
  row('weeks', '4', 'Сколько недель повторять расписание, от 1 до 52.', req),
  row('schedule', 'mon: legs-a', 'День недели (mon…sun) → id тренировки. Не указанный день — отдых.', req),
];

/** Целая секция plan; в тесте дописывается к файлу с тренировками upper-a, upper-b, legs-a, legs-b */
export const ALTERNATING = [
  'plan:',
  '  weeks: 4',
  '  schedule:',
  '    - { mon: upper-a, wed: legs-a, fri: upper-b }   # неделя 1, 3…',
  '    - { mon: upper-b, wed: legs-b, fri: upper-a }   # неделя 2, 4…',
];

export const REIMPORT: Array<{ title: string; text: string }> = [
  { title: 'Тот же id — обновление', text: 'На проверке можно выбрать: обновить, создать копию или пропустить.' },
  { title: 'Без id — возможный дубликат', text: 'Если название совпало с вашей тренировкой, спросим, что делать.' },
  { title: 'История не меняется', text: 'Выполненные тренировки и рекорды остаются как были — обновятся только будущие.' },
];

export const V1_NOTE = 'Файлы с version: 1 тоже читаются';

export const LIMITS =
  'До 1 МБ текста и до 500 тренировок за раз. В version: 2 незнакомое поле — ошибка с путём до него и подсказкой, какое поле имелось в виду.';

export interface FormatMistake {
  message: string;
  fix: string;
  /** Блок с этой ошибкой: тест требует, чтобы он не разбирался */
  wrong?: string[];
}

const hint = (field: string): string => V1_FIELD_HINTS[field] ?? '';
const wrongSets = (line: string): string[] => ['- type: sets', '  exercises:', `    - { ${line} }`];
/** «Поле v1 → поле v2»: подсказки берём из разбора, чтобы текст не расходился с ошибками */
const v1Mistake = (field: string, line: string): FormatMistake => ({
  message: `Поле ${field} из version: 1`,
  fix: `${hint(field)}.`,
  wrong: wrongSets(line),
});

export const ERRORS: FormatMistake[] = [
  v1Mistake('do', 'exercise_id: pullup, do: "3x8 @ 60"'),
  v1Mistake('rest', 'exercise_id: pullup, reps: 8, rest: 90s'),
  v1Mistake('time', 'exercise_id: dead-hang, time: 30s'),
  v1Mistake('weight', 'exercise_id: pullup, reps: 8, weight: 60'),
  v1Mistake('per_side', 'exercise_id: lunge, reps: 10, per_side: true'),
  v1Mistake('name', 'name: Подтягивания, reps: 8'),
  v1Mistake('distance', 'exercise_id: pullup, distance: 500m'),
  { message: 'У упражнения и reps, и time_sec', fix: 'Оставьте одно: повторы или время.', wrong: wrongSets('exercise_id: pullup, reps: 8, time_sec: 30') },
  { message: 'sets в круге', fix: 'В circuit подходы задаёт rounds, а у упражнения нет ни sets, ни rest_sec.', wrong: ['- type: circuit', '  rounds: 3', '  exercises:', '    - { exercise_id: pullup, sets: 3, reps: 8 }'] },
  { message: 'Неизвестный exercise_id: pulup', fix: 'Исправьте опечатку или опишите упражнение в exercises. В подсказке до трёх ближайших id.', wrong: wrongSets('exercise_id: pulup, reps: 8') },
  { message: 'Неверный отступ в строке 14', fix: 'YAML чувствителен к пробелам: отступ — 2 пробела, без табов.' },
  { message: 'id повторяется: legs-a', fix: 'У каждой тренировки в тексте свой id.' },
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
