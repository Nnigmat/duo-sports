import { useState, type ComponentProps } from 'react';
import type { Pose } from '../../../../../shared/types';
import { IconButton } from '../../../ui/IconButton/IconButton';
import { ProgressSegments } from '../../../ui/ProgressSegments/ProgressSegments';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { useMediaQuery } from '../../../shared';
import { Chibi } from '../chibi/Chibi';
import { ActionBar } from '../parts/ActionBar/ActionBar';
import { DemoVideo } from '../parts/DemoVideo/DemoVideo';
import { CoachNote } from '../parts/CoachNote/CoachNote';
import { ElapsedSince } from '../parts/ElapsedTime/ElapsedTime';
import { ThoughtBubble } from '../parts/ThoughtBubble/ThoughtBubble';
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
  /** Ролик чибика с упражнением вместо статичного; без него (или если не загрузился) стоит чибик */
  demoUrl?: string;
  /** Ролик «чибик стоит»: показывается вместо статичного чибика в позе «стоит» */
  idleUrl?: string;
  /** Ролик «чибик отдыхает»: показывается вместо статичного чибика в позе «отдых» */
  restUrl?: string;
  /** Ролик «чибик держит камеру»: показывается вместо статичного чибика в позе «камера» */
  cameraUrl?: string;
  /** Поза следующего упражнения: на отдыхе над чибиком появляется облачко-мысль с ней */
  thinkPose?: Pose;
  /** Ролик следующего упражнения для облачка-мысли */
  thinkDemoUrl?: string;
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
  /** Метка начала тренировки (мс): под названием круга идёт общее время; без неё времени нет */
  startedAt?: number | null;
  /** Стрелка «назад» в шапке; на экранах подходов её нет, там «Назад» в нижнем ряду */
  onBack?: () => void;
  onExit: () => void;
  onTech: () => void;
  /** «Заменить» упражнение; без него кнопки нет (разминка, отдых, библиотека не загрузилась) */
  onSwap?: () => void;
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
  demoUrl,
  idleUrl,
  restUrl,
  cameraUrl,
  thinkPose,
  thinkDemoUrl,
  note,
  techNew,
  recordable,
  canRecord = true,
  bar,
  startedAt,
  onBack,
  onExit,
  onTech,
  onSwap,
  onRecord,
  onOpenNotes,
}: Props) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Адрес, на котором ролик упал: смена упражнения даёт новый адрес и новую попытку
  const [failed, setFailed] = useState<string | null>(null);
  const clip = demoUrl ?? (pose === 'stand' ? idleUrl : pose === 'rest' ? restUrl : pose === 'camera' ? cameraUrl : undefined);
  const playing = clip && !still && failed !== clip ? clip : undefined;
  return (
    <Screen
      label={blockLabel}
      meta={<ElapsedSince startedAt={startedAt} />}
      back={onBack && { onClick: onBack }} close={{ onClick: onExit }}
      className={styles.screen}
    >
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
        {playing ? (
          <DemoVideo
            src={playing}
            onFail={() => setFailed(playing)}
            className={playing === idleUrl || playing === cameraUrl ? styles.idle : styles.demo}
          />
        ) : (
          <>
            <span className={styles.disc} aria-hidden="true" />
            <Chibi pose={pose} size={300} className={styles.chibi} />
          </>
        )}

        {thinkPose && <ThoughtBubble pose={thinkPose} demoUrl={thinkDemoUrl} still={still} className={styles.think} />}

        <div className={styles.left}>
          <IconButton
            icon="playCircle"
            caption="Техника"
            aria-label={techNew ? 'Техника, новый комментарий тренера' : 'Техника'}
            badge={techNew}
            onClick={onTech}
          />
          {onSwap && <IconButton icon="swap" caption="Заменить" aria-label="Заменить упражнение" onClick={onSwap} />}
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
