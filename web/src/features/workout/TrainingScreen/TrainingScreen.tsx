import type { ComponentProps } from 'react';
import type { Pose } from '../../../../../shared/types';
import { IconButton } from '../../../ui/IconButton/IconButton';
import { ProgressSegments } from '../../../ui/ProgressSegments/ProgressSegments';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { Chibi } from '../chibi/Chibi';
import { ActionBar } from '../parts/ActionBar/ActionBar';
import { CoachNote } from '../parts/CoachNote/CoachNote';
import { SpeechBubble } from '../parts/SpeechBubble/SpeechBubble';
import styles from './TrainingScreen.module.css';

type Props = {
  /** Название блока в шапке: «Круг 1 из 3» */
  blockLabel: string;
  /** Сегменты полоски: всего и номер текущего с нуля */
  progress: { count: number; current: number };
  eyebrow: string;
  line: string;
  pose: Pose;
  /** Последний комментарий тренера; без него карточки нет */
  note?: string;
  /** Точка «есть новое» на кнопке «Техника» */
  techNew?: boolean;
  /** Круг помечен для видео: кнопка «Запись» подсвечена и есть подсказка */
  recordable?: boolean;
  /** false — кнопка «Запись» недоступна (например, на отдыхе) */
  canRecord?: boolean;
  /** Нижний ряд: режим и его обработчики */
  bar: ComponentProps<typeof ActionBar>;
  onBack: () => void;
  onExit: () => void;
  onTech: () => void;
  onRecord: () => void;
  onOpenNotes: () => void;
};

/** Экран тренировки: данные и обработчики только через пропсы, запросов и таймеров внутри нет. */
export function TrainingScreen({
  blockLabel,
  progress,
  eyebrow,
  line,
  pose,
  note,
  techNew,
  recordable,
  canRecord = true,
  bar,
  onBack,
  onExit,
  onTech,
  onRecord,
  onOpenNotes,
}: Props) {
  return (
    <Screen label={blockLabel} back={{ onClick: onBack }} close={{ onClick: onExit }} className={styles.screen}>
      <ProgressSegments
        count={progress.count}
        current={progress.current}
        label="Прогресс блока"
        className={styles.progress}
      />

      <div className={styles.bubble}>
        <SpeechBubble eyebrow={eyebrow} line={line} />
      </div>

      <div className={styles.stage}>
        <span className={styles.disc} aria-hidden="true" />
        <Chibi pose={pose} size={300} className={styles.chibi} />

        <div className={styles.left}>
          <IconButton
            icon="playCircle"
            caption="Техника"
            aria-label={techNew ? 'Техника, новый комментарий тренера' : 'Техника'}
            badge={techNew}
            onClick={onTech}
          />
        </div>

        <div className={styles.right}>
          <IconButton
            icon="camera"
            caption="Запись"
            aria-label={recordable ? 'Начать запись' : 'Запись'}
            active={recordable}
            disabled={!canRecord}
            onClick={onRecord}
          />
        </div>

        <div className={styles.bottom}>
          {recordable && (
            <Text variant="body-sm" tag="p" className={styles.hint}>
              <span className={styles.dot} aria-hidden="true" />
              Нажмите на камеру, чтобы снять подход
            </Text>
          )}
          {note && <CoachNote text={note} onOpen={onOpenNotes} />}
        </div>
      </div>

      <ActionBar {...bar} />
    </Screen>
  );
}
