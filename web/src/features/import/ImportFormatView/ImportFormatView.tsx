import { Button, Notice, Text } from '../../../ui';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import { FieldTable } from '../FieldTable/FieldTable';
import {
  ALTERNATING, BLOCK_TYPES, ERRORS, EXAMPLE, EXERCISE_FIELDS, LIMITS, NEW_EXERCISE_FIELDS, PLAN_FIELDS, PYRAMID, REIMPORT, SECTIONS,
  SHORT_FORMS, TOP_FIELDS, UNITS, WORKOUT_FIELDS,
} from '../format';
import styles from './ImportFormatView.module.css';

type Props = {
  /** Копирует пример в буфер; вызывается с готовым текстом */
  onCopyExample: (text: string) => void;
  /** Ссылка «Импорт» в хлебных крошках и кнопка «К импорту» */
  importHref: string;
};

/** Страница «Формат импорта»: все поля, единицы и правила. Артборд «Импорт · Описание формата». */
export function ImportFormatView({ onCopyExample, importHref }: Props) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <nav aria-label="Хлебные крошки" className={styles.crumbs}>
          <a href={importHref}>Импорт</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Формат</span>
        </nav>
        <Text variant="display" tag="h1">
          Формат импорта
        </Text>
        <Text variant="body" color="slate">
          Тренировки и план описываются в YAML. Один текст — сколько угодно тренировок. Здесь все поля, единицы и правила.
        </Text>
      </header>

      <div className={styles.layout}>
        <nav aria-label="Содержание" className={styles.toc}>
          <Text variant="eyebrow">Содержание</Text>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.content}>
          <section id="example" aria-labelledby="h-example" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-example">
              Пример
            </Text>
            <Text variant="body-sm" color="slate">
              Одно новое упражнение и одна тренировка с датой: разминка, круг из 3 упражнений и заминка. Его можно вставить в импорт как есть.
            </Text>
            <CodeBlock lines={EXAMPLE} label="Пример YAML" numbered onCopy={onCopyExample} />
          </section>

          <section id="structure" aria-labelledby="h-structure" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-structure">
              Структура
            </Text>
            <Text variant="body-sm" color="slate">
              Четыре поля верхнего уровня. Обязательных два.
            </Text>
            <FieldTable rows={TOP_FIELDS} caption="Поля верхнего уровня" valueHeader="Значение" />
          </section>

          <section id="workout" aria-labelledby="h-workout" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-workout">
              Тренировка
            </Text>
            <Text variant="body-sm" color="slate">
              Каждый элемент списка <code>workouts</code> — один шаблон.
            </Text>
            <FieldTable rows={WORKOUT_FIELDS} caption="Поля тренировки" />
          </section>

          <section id="blocks" aria-labelledby="h-blocks" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-blocks">
              Блоки
            </Text>
            <Text variant="body-sm" color="slate">
              Тренировка состоит из блоков. Тип блока определяет порядок выполнения.
            </Text>
            <ul className={styles.blocks}>
              {BLOCK_TYPES.map((b) => (
                <li key={b.type} className={styles.block}>
                  <code className={styles.type}>type: {b.type}</code>
                  <Text variant="h5" tag="h3">
                    {b.title}
                  </Text>
                  <Text variant="body-sm" color="slate">
                    {b.description}
                  </Text>
                  <CodeBlock lines={b.code} label={`Блок ${b.type}`} />
                </li>
              ))}
            </ul>
          </section>

          <section id="exercise" aria-labelledby="h-exercise" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-exercise">
              Упражнение
            </Text>
            <Text variant="body-sm" color="slate">
              Нужно <code>name</code> или <code>exercise_id</code> и нагрузка. Нагрузку проще всего задать короткой записью <code>do</code>. Названия и id — в{' '}
              <a href={`${importHref}#exercises`}>списке упражнений на странице импорта</a>.
            </Text>
            <Text variant="eyebrow" tag="h3">
              Короткая запись · подходы × повторы @ вес
            </Text>
            <ul className={styles.shorts}>
              {SHORT_FORMS.map((s) => (
                <li key={s.code}>
                  <code>do: "{s.code}"</code>
                  <span>{s.description}</span>
                </li>
              ))}
            </ul>
            <FieldTable rows={EXERCISE_FIELDS} caption="Поля упражнения в тренировке" />
            <Text variant="h5" tag="h3">
              Разные подходы
            </Text>
            <Text variant="body-sm" color="slate">
              Пирамида, разминка или дроп-сет — списком в <code>sets</code>. Подход с <code>warmup: true</code> не идёт в объём и рекорды.
            </Text>
            <CodeBlock lines={PYRAMID} label="Пирамида подходов" />
          </section>

          <section id="new-exercises" aria-labelledby="h-newex" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-newex">
              Новые упражнения
            </Text>
            <Text variant="body-sm" color="slate">
              Если упражнения нет во вкладке «Упражнения», опишите его в <code>exercises</code> и ссылайтесь на него через <code>exercise_id</code>. Можно и просто написать{' '}
              <code>name</code> в тренировке — тогда группу мышц спросим на проверке.
            </Text>
            <Notice tone="info">
              Упражнения не создаются сами. На шаге «Проверка» для каждого вы выбираете: создать, взять похожее из библиотеки или не создавать — тогда оно уберётся из тренировок.
            </Notice>
            <FieldTable rows={NEW_EXERCISE_FIELDS} caption="Поля нового упражнения" />
          </section>

          <section id="units" aria-labelledby="h-units" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-units">
              Единицы
            </Text>
            <Text variant="body-sm" color="slate">
              Число без единицы — вес в <code>units</code> или секунды для времени.
            </Text>
            <dl className={styles.units}>
              {UNITS.map((u) => (
                <div key={u.title} className={styles.unit}>
                  <dt>{u.title}</dt>
                  <dd>
                    {u.values.map((v) => (
                      <code key={v}>{v}</code>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="plan" aria-labelledby="h-plan" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-plan">
              Даты и повтор
            </Text>
            <Text variant="body-sm" color="slate">
              Проще всего — <code>date</code> у каждой тренировки: так записывается план, где нагрузка растёт от недели к неделе. Даты в прошлом можно пропустить или сдвинуть на шаге «План».
              Для одинаковых недель есть <code>plan</code> — он повторяет тренировки без даты по дням недели.
            </Text>
            <FieldTable rows={PLAN_FIELDS} caption="Поля plan" />
            <Text variant="h5" tag="h3">
              Чередование недель
            </Text>
            <Text variant="body-sm" color="slate">
              Если <code>schedule</code> — список, недели берутся из него по кругу. Так задаются программы A/B.
            </Text>
            <CodeBlock lines={ALTERNATING} label="Чередование недель" />
          </section>

          <section id="reimport" aria-labelledby="h-reimport" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-reimport">
              Повторный импорт
            </Text>
            <Text variant="body-sm" color="slate">
              Один и тот же текст можно загружать много раз — правьте программу и импортируйте снова.
            </Text>
            <ul className={styles.cards}>
              {REIMPORT.map((r) => (
                <li key={r.title}>
                  <strong>{r.title}</strong>
                  <span>{r.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="errors" aria-labelledby="h-errors" className={styles.section}>
            <Text variant="h3" tag="h2" id="h-errors">
              Ошибки и ограничения
            </Text>
            <Text variant="body-sm" color="slate">
              {LIMITS}
            </Text>
            <ul className={styles.cards}>
              {ERRORS.map((e) => (
                <li key={e.message}>
                  <strong>{e.message}</strong>
                  <span>{e.fix}</span>
                </li>
              ))}
            </ul>
          </section>

          <footer className={styles.cta}>
            <div className={styles.ctaTexts}>
              <strong>Готовы загрузить?</strong>
              <span>Перед сохранением всё можно проверить.</span>
            </div>
            <Button href={importHref}>К импорту</Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
