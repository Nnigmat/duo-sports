import type { ReactNode } from 'react';
import { cx } from '../cx';
import { Text } from '../Text/Text';
import styles from './EmptyState.module.css';

type Props = {
  title: string;
  description?: string;
  /** Кнопка действия, например «Сбросить фильтры» */
  action?: ReactNode;
  className?: string;
};

/** Пустой экран или список: что произошло, что делать дальше. */
export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div className={cx(styles.root, className)}>
      <Text variant="h5" tag="p">
        {title}
      </Text>
      {description && (
        <Text variant="body-sm" color="slate">
          {description}
        </Text>
      )}
      {action}
    </div>
  );
}
