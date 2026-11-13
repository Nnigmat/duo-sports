import { useState } from 'react';
import type { Block } from '../../../../../shared/types';
import { Button } from '../../../ui/Button/Button';
import { Card } from '../../../ui/Card/Card';
import { Icon } from '../../../ui/Icon/Icon';
import { Screen } from '../../../ui/Screen/Screen';
import { Text } from '../../../ui/Text/Text';
import { useMediaQuery } from '../../../shared';
import { Chibi } from '../chibi/Chibi';
import { DemoVideo } from '../parts/DemoVideo/DemoVideo';
import { blockItems, gearList, plural, restLabel, timedTotal, videoLabel, workoutMeta } from '../flow';
import styles from './StartScreen.module.css';

type Props = {
  /** «Круговая тренировка» */
  title: string;
  blocks: Block[];
  /** «Пятница, 30 октября» */
  dateLabel: string;
  /** Инвентарь по id упражнения: из него собирается список «Инвентарь» */
  equipment?: Record<string, string[]>;
  /** Ролик «чибик стоит»; без него (или если не загрузился) стоит статичный чибик */
  idleUrl?: string;
  onBack: () => void;
  onStart: () => void;
};

/** Экран старта: что сегодня в тренировке и кнопка «Начать». */
export function StartScreen({ title, blocks, dateLabel, equipment, idleUrl, onBack, onStart }: Props) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [failed, setFailed] = useState(false);
  const gear = gearList(blocks, equipment ?? {});
  const playing = idleUrl && !still && !failed ? idleUrl : undefined;
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
          {playing ? (
            <DemoVideo src={playing} onFail={() => setFailed(true)} className={styles.idle} />
          ) : (
            <Chibi pose="stand" size={128} className={styles.chibi} />
          )}
        </div>
      </div>

      {gear.length > 0 && (
        <Card tone="surface" className={styles.gear}>
          <div className={styles.gearHead}>
            <Icon name="dumbbell" size={20} className={styles.gearIcon} />
            <Text variant="eyebrow" id="gear-title">
              Инвентарь
            </Text>
          </div>
          <ul className={styles.gearList} aria-labelledby="gear-title">
            {gear.map((g) => (
              <li key={g}>
                <Text variant="body-sm" tag="span" className={styles.gearItem}>
                  {g}
                </Text>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card tone="surface" className={styles.blocks}>
        {blocks.map((b, i) => (
          <section key={b.id} className={styles.section}>
            {i > 0 && <hr className={styles.rule} />}
            <BlockSection block={b} />
          </section>
        ))}
      </Card>

      {/* Кнопка остаётся внизу и на длинной тренировке */}
      <div className={styles.cta}>
        <Button fullWidth icon="play" onClick={onStart}>
          Начать тренировку
        </Button>
      </div>
    </Screen>
  );
}

function BlockSection({ block }: { block: Block }) {
  if (block.mode === 'timed') {
    return (
      <div className={styles.workHead}>
        <Text variant="eyebrow">{block.title}</Text>
        <Text variant="caption" tag="span" className={styles.strong}>
          {timedTotal(block)}
        </Text>
      </div>
    );
  }

  const rest = restLabel(block);
  const video = videoLabel(block);
  return (
    <>
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
    </>
  );
}
