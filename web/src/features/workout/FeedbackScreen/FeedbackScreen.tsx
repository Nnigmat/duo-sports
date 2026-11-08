import { Button } from '../../../ui/Button/Button';
import { cx } from '../../../ui/cx';
import { Notice } from '../../../ui/Notice/Notice';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { TextArea } from '../../../ui/TextArea/TextArea';
import { Chibi } from '../chibi/Chibi';
import { canSend, COMMENT_MAX, faceFor, RATINGS } from '../flow';
import styles from './FeedbackScreen.module.css';

/** Рот смайлика на кнопке оценки: от грустного к радостному (рисунок из макета) */
const MOUTHS = ['M8 16.8q4-3.4 8 0', 'M8.5 16q3.5-1.6 7 0', 'M8.5 15.5h7', 'M8.5 14.6q3.5 2.2 7 0', 'M7.8 14q4.2 4.4 8.4 0'];

type Props = {
  /** Выбранная оценка 1–5; null — ещё не выбрана */
  feeling: number | null;
  comment: string;
  /** Отправка идёт: кнопка занята, повторно не нажать */
  sending?: boolean;
  /** Текст ошибки последней отправки: оценка и комментарий остаются, можно повторить */
  error?: string | null;
  onRate: (value: number) => void;
  onComment: (text: string) => void;
  /** «Отправить тренеру»; вызывается только при выбранной оценке */
  onSend: () => void;
  /** Стрелка в шапке: обратно к итогам */
  onBack: () => void;
};

/** Экран «Обратная связь»: оценка самочувствия 1–5 (обязательна), чибик меняет эмоцию, необязательный комментарий. «Пропустить» нет. */
export function FeedbackScreen({ feeling, comment, sending, error, onRate, onComment, onSend, onBack }: Props) {
  const current = RATINGS.find((r) => r.value === feeling);
  const { face, pose } = faceFor(feeling);
  const ready = canSend(feeling);
  return (
    <Screen label="Обратная связь" back={{ onClick: onBack }} backLabel="К итогам">
      <div className={styles.hero}>
        <div className={styles.stage}>
          <span className={styles.disc} aria-hidden="true" />
          <Chibi pose={pose} face={face} size={148} className={styles.chibi} />
        </div>
        <Text variant="h2" tag="h2" className={styles.center}>
          Как самочувствие?
        </Text>
        <Text color="slate" className={styles.center}>
          Тренер увидит оценку вместе с результатами тренировки
        </Text>
      </div>

      <div role="group" aria-label="Оценка самочувствия" className={styles.rates}>
        {RATINGS.map((r, i) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={feeling === r.value}
            aria-label={r.label}
            className={cx(styles.rate, feeling === r.value && styles.on)}
            onClick={() => onRate(r.value)}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M9 9.8v.4M15 9.8v.4" strokeWidth="2.4" />
              <path d={MOUTHS[i]} />
            </svg>
          </button>
        ))}
      </div>
      <p className={styles.caption} aria-live="polite">
        {current ? (
          <>
            <strong className={styles.captionTitle}>{current.label}</strong> {current.hint}
          </>
        ) : (
          'Оцените от «плохо» до «отлично»'
        )}
      </p>

      <div className={styles.comment}>
        <TextArea
          label="Комментарий к тренировке"
          hint="необязательно"
          value={comment}
          maxLength={COMMENT_MAX}
          placeholder="Например: в выпадах тянуло колено, ножницы дались легко"
          onChange={(e) => onComment(e.target.value)}
        />
      </div>

      <div className={styles.spacer} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button fullWidth disabled={!ready} loading={sending} onClick={onSend}>
        {ready ? 'Отправить тренеру' : 'Выберите самочувствие'}
      </Button>
    </Screen>
  );
}
