import { useId } from 'react';
import { Chip, Icon, Text } from '../../../ui';
import { CONFLICT_CHOICES, commonChoice, conflictsTitle, dayLabel, type Conflict, type ConflictChoice } from '../importPlan';
import styles from './ConflictsSection.module.css';

type Props = {
  conflicts: Conflict[];
  /** Выбор для одного дня */
  onChoice: (date: string, choice: ConflictChoice) => void;
  /** Один выбор для всех дней */
  onChoiceAll: (choice: ConflictChoice) => void;
};

/** Дни, где в плане уже стоит другая тренировка: заменить, оставить обе или оставить свою. */
export function ConflictsSection({ conflicts, onChoice, onChoiceAll }: Props) {
  const uid = useId();
  const all = commonChoice(conflicts);
  if (conflicts.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby={`${uid}-title`}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <Text variant="h3" tag="h2" id={`${uid}-title`}>
            {conflictsTitle(conflicts.length)}
          </Text>
          <Text variant="body-sm" color="slate">
            В эти дни у вас уже стоит другая тренировка
          </Text>
        </div>
        <div className={styles.all} role="group" aria-label="Для всех">
          <span className={styles.allLabel} aria-hidden="true">
            Для всех
          </span>
          {CONFLICT_CHOICES.map((o) => (
            <Chip key={o.id} pressed={all === o.id} onClick={() => onChoiceAll(o.id)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

      <ul className={styles.list}>
        {conflicts.map((c) => (
          <li key={c.date} className={styles.row}>
            <div className={styles.info}>
              <span className={styles.day}>
                <Icon name="warning" size={20} />
                {dayLabel(c.date)}
              </span>
              <span className={styles.text}>
                Ваша «{c.mine}» и «{c.theirs}» из файла
              </span>
            </div>
            <div className={styles.options} role="group" aria-label={`Решение для ${dayLabel(c.date)}`}>
              {CONFLICT_CHOICES.map((o) => (
                <Chip key={o.id} pressed={c.choice === o.id} onClick={() => onChoice(c.date, o.id)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
