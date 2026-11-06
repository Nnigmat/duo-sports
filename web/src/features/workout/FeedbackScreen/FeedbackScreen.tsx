import { Button } from '../../../ui/Button/Button';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import styles from './FeedbackScreen.module.css';

type Props = {
  /** «Отправить»: сохранить итог и выйти */
  onSend: () => void;
  /** Стрелка в шапке: обратно к итогам */
  onBack: () => void;
};

/** Экран «Обратная связь». Пока заглушка: оценки самочувствия нет, итог уходит по «Отправить». */
export function FeedbackScreen({ onSend, onBack }: Props) {
  return (
    <Screen label="Обратная связь" back={{ onClick: onBack }} backLabel="К итогам">
      <div className={styles.body}>
        <Text color="slate">Здесь появится оценка самочувствия.</Text>
      </div>
      <Button fullWidth onClick={onSend}>
        Отправить
      </Button>
    </Screen>
  );
}
