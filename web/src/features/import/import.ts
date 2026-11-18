import type { ExerciseKind } from '../../../../shared/types';
import { groupTabs, type GroupFilter } from '../exercises/library';
import type { LibraryEntry } from '../../../../shared/types';
import { addDays, parseIso } from '../plan/plan';
import { plural } from '../workout/flow/ru';

/** Шаги импорта: источник → проверка → план → готово */
export const IMPORT_STEPS = ['Источник', 'Проверка', 'План', 'Готово'] as const;

/** Пример для кнопки «Вставить пример». Даты — ближайшие вторник и четверг, чтобы пример сразу ложился в календарь. */
const sampleTemplate = (first: string, second: string) => `version: 2

# Новые упражнения: название совпало с библиотекой — возьмём оттуда, иначе создадим с вашего согласия
exercises:
  - id: reverse-pushup
    name: Обратные отжимания от лавочки
    muscles: [трицепс]
    measure: reps
    notes: Таз неподвижен, работают только руки
  - id: floor-scissors
    name: Ножницы лёжа
    muscles: [пресс]
    measure: reps
  - id: lunge-in-place
    name: Выпады на месте
    muscles: [ноги, ягодицы]
    measure: reps
  - id: touch-pushup
    name: Отжимания с касанием предмета
    muscles: [грудь, трицепс]
    measure: reps
  - id: hanging-knee-raise
    name: Подтягивание колен в висе
    muscles: [пресс]
    measure: reps
  - id: boat
    name: Лодочка
    muscles: [спина, поясница]
    measure: reps

workouts:
  - id: w01-tue
    date: ${first}
    title: Трицепс, пресс, ноги
    blocks:
      # Разминка — набор из библиотеки:
      # - { type: warmup, routine: <id набора из библиотеки> }
      - type: circuit
        rounds: 3
        exercises:
          - { exercise_id: reverse-pushup, reps: 18-20 }
          - { exercise_id: floor-scissors, reps: 30-34 }
          - { exercise_id: lunge-in-place, reps: 14-16 }

  - id: w01-thu
    date: ${second}
    title: Грудь, кор, спина
    blocks:
      - type: circuit
        rounds: 3
        exercises:
          - { exercise_id: touch-pushup, reps: 14-20 }
          - { exercise_id: hanging-knee-raise, reps: max }
          - { exercise_id: boat, reps: 26-30 }
`;

export function sampleYaml(today: string): string {
  const dow = (parseIso(today).getDay() + 6) % 7;
  const tuesday = addDays(today, (1 - dow + 7) % 7);
  return sampleTemplate(tuesday, addDays(tuesday, 2));
}

/** Базовый шаблон для кнопки «Создать тренировку»: одна тренировка на выбранный день, остаётся поправить название и упражнения */
export const newWorkoutYaml = (date: string): string => `version: 2

# exercise_id — id из библиотеки или из exercises ниже.
# Название совпало с библиотекой — возьмём оттуда, иначе создадим новое.
exercises:
  - { id: air-squat, name: Приседания, muscles: [квадрицепс, ягодицы], measure: reps }
  - { id: pushups, name: Отжимания, muscles: [грудь, трицепс], measure: reps }
  - { id: plank-hold, name: Планка, muscles: [пресс, кор], measure: time }

workouts:
  - date: ${date}
    title: Новая тренировка
    blocks:
      # Разминка — набор из библиотеки:
      # - { type: warmup, routine: <id набора из библиотеки> }
      - type: sets
        exercises:
          - { exercise_id: air-squat, sets: 3, reps: 12 }
          - { exercise_id: pushups, sets: 3, reps: 10 }
          - { exercise_id: plank-hold, sets: 1, time_sec: 45 }
`;

/** Пример на «сегодня» из макета: для историй и тестов */
export const SAMPLE_YAML = sampleYaml('2026-11-02');

/** Строка статуса под полем: «Вставлено 54 строки». Пустой текст — пустая строка. */
export function sourceStatus(text: string): string {
  if (!text.trim()) return '';
  const lines = text.replace(/\n+$/, '').split('\n').length;
  return `Вставлено ${lines} ${plural(lines, ['строка', 'строки', 'строк'])}`;
}

/** Что писать в тренировке для каждого вида нагрузки */
export const MEASURE_HINTS: Array<{ measure: ExerciseKind | 'distance'; example: string }> = [
  { measure: 'weight', example: 'do: "4x8 @ 75"' },
  { measure: 'reps', example: 'do: "3x12"' },
  { measure: 'time', example: 'time: 45s' },
  { measure: 'distance', example: 'distance: 2km' },
];

/** measure в YAML: у нас weight, reps и time называются так же, как в библиотеке */
export function measureOf(ex: LibraryEntry): ExerciseKind {
  return ex.kind;
}

/** Упражнения для справочника: по группе и по названию, id или алиасу */
export function referenceList(list: LibraryEntry[], query: string, group: GroupFilter): LibraryEntry[] {
  const needle = query.trim().toLowerCase();
  return list.filter((ex) => {
    if (group !== 'all' && ex.group !== group) return false;
    if (!needle) return true;
    return [ex.id, ex.name, ...(ex.aliases ?? [])].some((s) => s.toLowerCase().includes(needle));
  });
}

/** Фильтры справочника: считаем по всему списку, поиск на них не влияет */
export function referenceGroups(list: LibraryEntry[]) {
  return groupTabs(list);
}

/** Запись упражнения в exercises.yaml */
export function exerciseYaml(ex: LibraryEntry, custom = false): string {
  const lines = [`  - id: ${ex.id}`, `    name: ${ex.name}`];
  if (ex.aliases?.length) lines.push(`    aliases: [${ex.aliases.join(', ')}]`);
  lines.push(`    muscles: [${ex.muscles.map((m) => m.toLowerCase()).join(', ')}]`, `    measure: ${measureOf(ex)}`);
  if (custom) lines.push('    # своё');
  return lines.join('\n');
}

/** Весь файл exercises.yaml: его копирует кнопка «Копировать» */
export function referenceYamlFile(list: LibraryEntry[]): string {
  return `${['exercises:', ...list.map((ex) => exerciseYaml(ex))].join('\n')}\n`;
}

/** Заголовок списка: «Показано 9 из 31 упражнения» или «31 упражнение» */
export function referenceHeader(shown: number, total: number): string {
  const word = (n: number) => plural(n, ['упражнение', 'упражнения', 'упражнений']);
  return shown === total ? `${total} ${word(total)}` : `Показано ${shown} из ${total} ${plural(total, ['упражнения', 'упражнений', 'упражнений'])}`;
}
