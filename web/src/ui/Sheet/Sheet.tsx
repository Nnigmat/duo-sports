import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import { IconButton } from '../IconButton/IconButton';
import { Text } from '../Text/Text';
import { useReturnFocus } from '../useReturnFocus';
import styles from './Sheet.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Надстрочник над заголовком */
  eyebrow?: string;
  /** Почти на весь экран; содержимое прокручивается */
  tall?: boolean;
  /** Кнопка «Назад» слева от названия: вернуться на предыдущую панель */
  onBack?: () => void;
  children: ReactNode;
};

/** Нижняя панель. Закрывается по Esc, тапу на фон и ✕; фокус остаётся внутри. */
export function Sheet({ open, onOpenChange, title, eyebrow, tall, onBack, children }: Props) {
  const returnFocus = useReturnFocus(open);
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.scrim} />
        <RadixDialog.Content
          className={cx(styles.sheet, tall && styles.tall)}
          aria-describedby={undefined}
          onCloseAutoFocus={returnFocus}
        >
          <div className={styles.handle} aria-hidden="true" />
          <div className={styles.header}>
            {onBack && <IconButton bare icon="back" aria-label="Назад" onClick={onBack} className={styles.back} />}
            <div className={styles.titles}>
              {eyebrow && <Text variant="eyebrow">{eyebrow}</Text>}
              <RadixDialog.Title asChild>
                <Text variant="h4" tag="h2">
                  {title}
                </Text>
              </RadixDialog.Title>
            </div>
            <RadixDialog.Close asChild>
              <IconButton bare icon="close" aria-label="Закрыть" />
            </RadixDialog.Close>
          </div>
          {/* Прокручиваемая область должна быть доступна с клавиатуры, даже если внутри нет контролов */}
          <div className={styles.body} tabIndex={tall ? 0 : undefined}>{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
