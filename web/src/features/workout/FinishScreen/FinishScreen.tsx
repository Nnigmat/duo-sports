import { Button } from '../../../ui/Button/Button';
import { ProgressSegments } from '../../../ui/ProgressSegments/ProgressSegments';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { Chibi } from '../chibi/Chibi';
import { formatFinishStats, type FinishStats } from '../flow';
import { SpeechBubble } from '../parts/SpeechBubble/SpeechBubble';
import styles from './FinishScreen.module.css';

type Props = {
  stats: FinishStats;
  /** «Завершить»: сохранить итог и выйти */
  onFinish: () => void;
  /** ✕ в шапке */
  onClose: () => void;
};

/** Экран финиша: радующийся чибик, итоги и «Завершить». */
export function FinishScreen({ stats, onFinish, onClose }: Props) {
  const count = Math.max(1, stats.setsTotal);
  return (
    <Screen label="Финиш" close={{ onClick: onClose }} closeLabel="Закрыть">
      <ProgressSegments count={count} current={count} label="Прогресс тренировки" className={styles.progress} />

      <div className={styles.bubble}>
        <SpeechBubble eyebrow="Готово" line="Тренировка пройдена" />
      </div>

      <div className={styles.stage}>
        <span className={styles.disc} aria-hidden="true" />
        <Chibi pose="cheer" size={320} className={styles.chibi} />
      </div>

      <dl className={styles.stats}>
        {formatFinishStats(stats).map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt className={styles.label}>
              <Text variant="caption">{s.label}</Text>
            </dt>
            <dd className={styles.value}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <Button fullWidth onClick={onFinish}>
        Завершить
      </Button>
    </Screen>
  );
}
