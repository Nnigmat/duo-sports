import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './ChoiceCard.module.css';

type Props = {
  /** Общее имя группы radio */
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  disabled?: boolean;
  /** Иконка слева от текста, например тип упражнения */
  icon?: IconName;
  className?: string;
};

/** Карточка-вариант: настоящий input type=radio внутри label. */
export function ChoiceCard({ name, value, checked, onChange, title, description, disabled, icon, className }: Props) {
  return (
    <label className={cx(styles.card, checked && styles.checked, disabled && styles.disabled, className)}>
      <input
        type="radio"
        className={styles.input}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
      />
      <span className={styles.mark} aria-hidden="true" />
      {icon && <Icon name={icon} className={styles.icon} />}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  );
}
