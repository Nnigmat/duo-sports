import { useId, useState } from "react";
import type { LibraryEntry } from "../../../../../shared/types";
import type { GroupFilter } from "../../exercises/library";
import { Button, SearchField, Select, Text } from "../../../ui";
import {
  exerciseYaml,
  MEASURE_HINTS,
  referenceGroups,
  referenceHeader,
  referenceList,
  referenceYamlFile,
} from "../import";
import styles from "./ExerciseReference.module.css";

type Props = {
  exercises: LibraryEntry[];
  /** id упражнений, которые пользователь создал сам: у них пометка «# своё» */
  customIds?: string[];
  /** Копирует exercises.yaml; вызывается с готовым текстом */
  onCopy: (text: string) => void;
  /** Развёрнут ли справочник при открытии; по умолчанию свёрнут */
  defaultOpen?: boolean;
};

/** Справочник упражнений библиотеки: что писать в `name` или `exercise_id`, чтобы упражнение нашлось. */
export function ExerciseReference({
  exercises,
  customIds = [],
  onCopy,
  defaultOpen = false,
}: Props) {
  const bodyId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [copied, setCopied] = useState(false);
  const shown = referenceList(exercises, query, group);

  return (
    <section id="exercises" className={styles.root} aria-labelledby="ref-title">
      <div className={styles.head}>
        <div className={styles.titles}>
          <Text variant="h3" tag="h2" id="ref-title">
            Упражнения в библиотеке
          </Text>
          <Text variant="body-sm" color="slate">
            Пишите в тренировке <code>name</code> или <code>exercise_id</code>{" "}
            отсюда — тогда упражнение найдётся без вопросов. Названия из{" "}
            <code>aliases</code> тоже подходят.
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            compact
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Скрыть" : "Показать"}
          </Button>
          <Button
            variant="secondary"
            compact
            icon={copied ? "check" : "copy"}
            onClick={() => {
              onCopy(referenceYamlFile(exercises));
              setCopied(true);
            }}
          >
            {copied ? "Скопировано" : "Копировать exercises.yaml"}
          </Button>
        </div>
      </div>

      <div id={bodyId} className={styles.body} hidden={!open}>
        <div className={styles.filters}>
          <SearchField
            label="Поиск упражнения"
            placeholder="Название или id"
            value={query}
            onValueChange={setQuery}
          />
          <Select
            label="Группа мышц"
            value={group}
            onChange={(e) => setGroup(e.target.value as GroupFilter)}
          >
            {referenceGroups(exercises).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.count})
              </option>
            ))}
          </Select>
        </div>

        <Text variant="caption" color="steel" role="status">
          {referenceHeader(shown.length, exercises.length)}
        </Text>
        {shown.length > 0 ? (
          <pre
            className={styles.code}
            tabIndex={0}
            aria-label="Упражнения в формате YAML"
          >
            {"exercises:\n" +
              shown
                .map((ex) => exerciseYaml(ex, customIds.includes(ex.id)))
                .join("\n")}
          </pre>
        ) : (
          <Text variant="body-sm" color="slate">
            Ничего не найдено. Упражнение можно описать прямо в тренировке — его
            предложат создать на проверке.
          </Text>
        )}

        <div className={styles.measures}>
          <Text variant="h5" tag="h3">
            Как задать нагрузку
          </Text>
          <Text variant="body-sm" color="slate">
            Поле <code>measure</code> подсказывает, что писать в тренировке.
          </Text>
          <dl className={styles.dl}>
            {MEASURE_HINTS.map((m) => (
              <div key={m.measure} className={styles.dlRow}>
                <dt>
                  <code>{m.measure}</code>
                </dt>
                <dd>
                  <code>{m.example}</code>
                </dd>
              </div>
            ))}
          </dl>
          <Text variant="caption" color="steel">
            «# своё» — упражнения, которые вы создали сами.
          </Text>
        </div>
      </div>
    </section>
  );
}
