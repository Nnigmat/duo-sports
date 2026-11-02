import type { ExerciseKind } from '../../../../shared/types';
import { groupTabs, type GroupFilter } from '../exercises/library';
import type { LibraryEntry } from '../../../../shared/types';
import { addDays, parseIso } from '../plan/plan';
import { plural } from '../workout/flow/ru';

/** Шаги импорта: источник → проверка → план → готово */
export const IMPORT_STEPS = ['Источник', 'Проверка', 'План', 'Готово'] as const;

/** Пример для кнопки «Вставить пример». Даты — ближайшие вторник и четверг, чтобы пример сразу ложился в календарь. */
const sampleTemplate = (first: string, second: string) => `version: 1
units: kg

exercises:                     # новые — создадим с вашего согласия
  - id: reverse-pushup
    name: Обратные отжимания от лавочки
    muscles: [трицепс]
    measure: reps
    video: https://youtu.be/…
    notes: Таз неподвижен, работают только руки
  - id: floor-scissors
    name: Ножницы лёжа
    muscles: [пресс]
    measure: reps

workouts:
  - id: w01-tue
    date: ${first}
    title: Трицепс, пресс, ноги
    blocks:
      - type: warmup
        time: 5-7m
        text: Разогреться любым способом, ОРУ ~10 мин
      - type: circuit
        rounds: 3
        exercises:
          - { exercise_id: reverse-pushup, reps: 18-20 }
          - { exercise_id: floor-scissors, reps: 30-34 }
          - { name: Выпады на месте, reps: 14-16 }
      - type: cooldown
        text: Растяжка, расслабление спины

  - id: w01-thu
    date: ${second}
    title: Грудь, кор, спина
    blocks:
      - type: circuit
        rounds: 3
        exercises:
          - { name: Отжимания с касанием предмета, reps: 14-20 }
          - { name: Подтягивание колен в висе, reps: max }
          - { name: Лодочка, reps: 26-30 }
`;

export function sampleYaml(today: string): string {
  const dow = (parseIso(today).getDay() + 6) % 7;
  const tuesday = addDays(today, (1 - dow + 7) % 7);
  return sampleTemplate(tuesday, addDays(tuesday, 2));
}

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
  return ['exercises:', ...list.map((ex) => exerciseYaml(ex))].join('\n') + '\n';
}

/** Заголовок списка: «Показано 9 из 31 упражнения» или «31 упражнение» */
export function referenceHeader(shown: number, total: number): string {
  const word = (n: number) => plural(n, ['упражнение', 'упражнения', 'упражнений']);
  return shown === total ? `${total} ${word(total)}` : `Показано ${shown} из ${total} ${plural(total, ['упражнения', 'упражнений', 'упражнений'])}`;
}
