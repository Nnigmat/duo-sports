import type { Block } from '../../../../../shared/types';
import { Button } from '../../../ui/Button/Button';
import { Card } from '../../../ui/Card/Card';
import { Icon } from '../../../ui/Icon/Icon';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { Chibi } from '../chibi/Chibi';
import { blockItems, plural, restLabel, timedHeadline, videoLabel, workoutMeta } from '../flow';
import styles from './StartScreen.module.css';

type Props = {
  /** «Круговая тренировка» */
  title: string;
  blocks: Block[];
  /** «Пятница, 30 октября» */
  dateLabel: string;
  onBack: () => void;
  onStart: () => void;
};

/** Экран старта: что сегодня в тренировке и кнопка «Начать». */
export function StartScreen({ title, blocks, dateLabel, onBack, onStart }: Props) {
  return (
    <Screen label={dateLabel} back={{ onClick: onBack }}>
      <div className={styles.top}>
        <div className={styles.titles}>
          <Text variant="eyebrow">Сегодня</Text>
          <Text variant="h1">{title}</Text>
          <Text variant="body-sm" color="slate">
            {workoutMeta(blocks)}
          </Text>
        </div>
        <div className={styles.mascot}>
          <span className={styles.disc} aria-hidden="true" />
          <Chibi pose="stand" size={128} className={styles.chibi} />
        </div>
      </div>

      <ul className={styles.blocks}>
        {blocks.map((b) => (
          <li key={b.id}>
            <BlockCard block={b} />
          </li>
        ))}
      </ul>

      {/* Кнопка остаётся внизу и на длинной тренировке */}
      <div className={styles.cta}>
        <Button fullWidth icon="play" onClick={onStart}>
          Начать тренировку
        </Button>
      </div>
    </Screen>
  );
}

function BlockCard({ block }: { block: Block }) {
  if (block.mode === 'timed') {
    return (
      <Card>
        <Text variant="eyebrow">{block.title}</Text>
        <Text variant="body" tag="p" className={styles.headline}>
          {timedHeadline(block)}
        </Text>
        {block.note && (
          <Text variant="body-sm" color="slate">
            {block.note}
          </Text>
        )}
      </Card>
    );
  }

  const rest = restLabel(block);
  const video = videoLabel(block);
  return (
    <Card tone="surface" className={styles.work}>
      <div className={styles.workHead}>
        <Text variant="eyebrow">{block.mode === 'circuit' ? 'По кругу с отдыхом' : 'Подходами'}</Text>
        {block.mode === 'circuit' && (
          <Text variant="caption" tag="span" className={styles.strong}>
            {block.rounds} {plural(block.rounds, ['круг', 'круга', 'кругов'])}
          </Text>
        )}
      </div>

      <ol className={styles.items}>
        {blockItems(block).map((item, i) => (
          <li key={item.name} className={styles.item}>
            <span className={styles.number} aria-hidden="true">
              {i + 1}
            </span>
            <Text variant="body-sm" tag="span" className={styles.itemName}>
              {item.name}
            </Text>
            <Text variant="body-sm" tag="span" color="slate" className={styles.itemTarget}>
              {item.target}
            </Text>
          </li>
        ))}
      </ol>

      {(rest || video) && <hr className={styles.rule} />}
      {rest && (
        <Text variant="caption" color="slate">
          {rest}
        </Text>
      )}
      {video && (
        <p className={styles.video}>
          <Icon name="camera" size={20} className={styles.videoIcon} />
          <Text variant="caption" tag="span" className={styles.videoText}>
            {video}
          </Text>
        </p>
      )}
    </Card>
  );
}
