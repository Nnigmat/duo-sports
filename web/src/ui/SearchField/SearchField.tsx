import { useId, useRef, type ComponentProps } from 'react';
import { cx } from '../cx';
import { Icon } from '../Icon/Icon';
import styles from './SearchField.module.css';

type Props = Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'id'> & {
  /** Подпись для скринридера; на экране не показывается, подсказку несёт placeholder */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

/** Поле поиска: иконка слева, «Очистить» справа, когда есть текст. */
export function SearchField({ label, value, onValueChange, className, ...input }: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cx(styles.root, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <Icon name="search" className={styles.icon} />
      <input
        {...input}
        ref={ref}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={styles.input}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Очистить поиск"
          onClick={() => {
            onValueChange('');
            ref.current?.focus();
          }}
        >
          <Icon name="close" size={20} />
        </button>
      )}
    </div>
  );
}
