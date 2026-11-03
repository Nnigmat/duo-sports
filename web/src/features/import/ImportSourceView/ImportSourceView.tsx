import { useId } from 'react';
import type { LibraryEntry } from '../../../../../shared/types';
import { Button, Notice, Text } from '../../../ui';
import { ExerciseReference } from '../ExerciseReference/ExerciseReference';
import { ImportSteps } from '../ImportSteps/ImportSteps';
import type { ParseIssue } from '../parse';
import { SAMPLE_YAML, sourceStatus } from '../import';
import styles from './ImportSourceView.module.css';

type Props = {
  text: string;
  onTextChange: (text: string) => void;
  exercises: LibraryEntry[];
  customIds?: string[];
  onCopyReference: (text: string) => void;
  /** Ссылка на «Полное описание формата» */
  formatHref: string;
  /** Ошибки разбора после «Проверить»; пока они есть, переход дальше закрыт */
  issues?: ParseIssue[];
  /** Текст для «Вставить пример»; по умолчанию — пример на день из макета */
  sample?: string;
  onCheck: () => void;
};

const FORMAT_SKELETON = `version: 1
exercises: [ … ]  # необязательно
workouts:
  - date: 2026-11-03
    title: Трицепс, пресс
    blocks: [ … ]`;

/** Шаг 1 импорта: вставить YAML и свериться со справочником упражнений. Артборд «Импорт · 1 Источник». */
export function ImportSourceView({ text, onTextChange, exercises, customIds, onCopyReference, formatHref, issues = [], sample = SAMPLE_YAML, onCheck }: Props) {
  const fieldId = useId();
  const statusId = useId();
  const empty = text.trim() === '';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Text variant="display" tag="h1">
          Импорт тренировок
        </Text>
        <Text variant="body" color="slate">
          Вставьте план тренировок в формате YAML — хоть на несколько месяцев вперёд. Перед сохранением всё можно проверить.
        </Text>
      </header>

      <ImportSteps current={1} />

      <div className={styles.columns}>
        <section className={styles.source} aria-label="Источник">
          <div className={styles.sourceHead}>
            <label htmlFor={fieldId} className={styles.label}>
              Вставьте YAML
            </label>
            <div className={styles.tools}>
              <Button variant="ghost" compact onClick={() => onTextChange(sample)}>
                Вставить пример
              </Button>
              <Button variant="ghost" compact disabled={empty} onClick={() => onTextChange('')}>
                Очистить
              </Button>
            </div>
          </div>
          <div className={styles.field}>
            <textarea
              id={fieldId}
              className={styles.textarea}
              rows={24}
              spellCheck={false}
              placeholder="version: 1"
              value={text}
              aria-describedby={statusId}
              onChange={(e) => onTextChange(e.target.value)}
            />
            {/* Недоступна, пока поле пустое; как только появился текст, становится активной */}
            <Button className={styles.check} compact disabled={empty} onClick={onCheck}>
              Проверить
            </Button>
          </div>
          {issues.length > 0 && (
            <section className={styles.issues} aria-label="Ошибки в тексте">
              <Text variant="h5" tag="h2">
                {`${issues.length} ${issues.length === 1 ? 'ошибка' : 'ошибок'} в тексте`}
              </Text>
              <ul className={styles.issueList}>
                {issues.map((e, i) => (
                  <li key={i}>
                    <Notice tone="error">
                      <strong>{e.message}</strong>
                      {e.hint && <span className={styles.hint}> {e.hint}</span>}
                    </Notice>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Text variant="caption" color="steel" id={statusId} role="status">
            {empty
              ? 'Можно вставить сколько угодно тренировок сразу. Не знаете, с чего начать, — вставьте пример и поправьте его.'
              : sourceStatus(text)}
          </Text>
        </section>

        <aside className={styles.format} aria-labelledby={`${fieldId}-fmt`}>
          <Text variant="h4" tag="h2" id={`${fieldId}-fmt`}>
            Формат
          </Text>
          <Text variant="body-sm" color="slate">
            Тренировки с датами и, если нужно, новые упражнения.
          </Text>
          <pre className={styles.skeleton} tabIndex={0} aria-label="Скелет файла в формате YAML">{FORMAT_SKELETON}</pre>
          <a href={formatHref} className={styles.link}>
            Полное описание формата
          </a>
        </aside>
      </div>

      <ExerciseReference exercises={exercises} customIds={customIds} onCopy={onCopyReference} />
    </div>
  );
}
