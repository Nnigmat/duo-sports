import * as RadixDialog from '@radix-ui/react-dialog';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { useReturnFocus } from '../useReturnFocus';
import styles from './Dialog.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Вопрос: «Закончить тренировку?» */
  title: string;
  /** Последствие: «Выполненные подходы сохранятся» */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Необратимое действие — кнопка danger */
  danger?: boolean;
  loading?: boolean;
  /** Диалог сам не закрывается после подтверждения: закройте его в обработчике */
  onConfirm: () => void;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Отмена',
  danger,
  loading,
  onConfirm,
}: Props) {
  const returnFocus = useReturnFocus(open);
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.scrim} />
        <RadixDialog.Content className={styles.dialog} onCloseAutoFocus={returnFocus}>
          <div className={styles.text}>
            <RadixDialog.Title asChild>
              <Text variant="h4" tag="h2">
                {title}
              </Text>
            </RadixDialog.Title>
            <RadixDialog.Description asChild>
              <Text variant="body-sm" color="slate">
                {description}
              </Text>
            </RadixDialog.Description>
          </div>
          <div className={styles.actions}>
            <RadixDialog.Close asChild>
              <Button variant="secondary" fullWidth>
                {cancelLabel}
              </Button>
            </RadixDialog.Close>
            <Button variant={danger ? 'danger' : 'primary'} fullWidth loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
