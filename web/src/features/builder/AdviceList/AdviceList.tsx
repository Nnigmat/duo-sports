import { Button, IconButton, Text } from '../../../ui';
import type { Advice } from '../types';
import styles from './AdviceList.module.css';

type Props = {
  advice: Advice[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
};

/** Заметки агента над формой: у заметки с похожим из библиотеки — «Заменить на „…“». */
export function AdviceList({ advice, onApply, onDismiss }: Props) {
  if (advice.length === 0) return null;
  return (
    <section className={styles.root} aria-labelledby="advice-title">
      <Text variant="eyebrow" tag="h2" id="advice-title">
        Заметки агента
      </Text>
      <ul className={styles.list}>
        {advice.map((a) => (
          <li key={a.id} className={styles.item}>
            <div className={styles.head}>
              <Text variant="body-sm" className={styles.text}>
                {a.text}
              </Text>
              <IconButton bare icon="close" aria-label="Скрыть заметку" onClick={() => onDismiss(a.id)} />
            </div>
            {a.suggest && a.exercise && (
              <Button variant="secondary" compact onClick={() => onApply(a.id)} className={styles.apply}>
                {`Заменить на „${a.suggest}“`}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
