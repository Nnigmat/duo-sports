import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { TextArea } from '../../../ui/TextArea/TextArea';
import { ActionBar } from '../parts/ActionBar/ActionBar';
import styles from './NoteStage.module.css';

/** Длина ответа, как на сервере (MAX_COMMENT) */
export const ANSWER_MAX = 1000;

type Props = {
  title: string;
  text: string;
  /** Что спортсмен уже написал; пусто — ответа нет */
  answer: string;
  onAnswer: (text: string) => void;
  onDone: () => void;
  /** Нет на первом шаге: кнопки «Назад» нет, место остаётся */
  onBack?: () => void;
  onSkip: () => void;
  onExit: () => void;
};

/**
 * Шаг-заметка: заголовок и текст тренера, необязательный «Ответ» и «Готово».
 * Ответ не блокирует «Готово»: можно пройти шаг молча.
 */
export function NoteStage({ title, text, answer, onAnswer, onDone, onBack, onSkip, onExit }: Props) {
  return (
    <Screen label="Заметка" close={{ onClick: onExit }}>
      <div className={styles.body}>
        <Text variant="h2" tag="h2" className={styles.title}>
          {title}
        </Text>
        <Text color="slate" className={styles.text}>
          {text}
        </Text>
        <TextArea label="Ответ" hint="необязательно" value={answer} maxLength={ANSWER_MAX} onChange={(e) => onAnswer(e.target.value)} />
      </div>
      <ActionBar mode="set" onDone={onDone} onBack={onBack} onSkip={onSkip} />
    </Screen>
  );
}
