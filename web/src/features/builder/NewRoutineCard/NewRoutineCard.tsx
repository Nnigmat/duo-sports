import { Badge, Button, Card, IconButton, ParamStepper, Text, TextInput } from '../../../ui';
import type { RoutinePick } from '../types';
import styles from './NewRoutineCard.module.css';

type Props = {
  label: 'Разминка' | 'Заминка';
  pick: Extract<RoutinePick, { kind: 'new' }>;
  onRename: (title: string) => void;
  onSec: (index: number, sec: number) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (index: number) => void;
  /** «Убрать разминку» целиком */
  onDrop: () => void;
  /** Имена новых упражнений: пометка «новое» (текстом) и кнопка «Открыть», как в строках формы */
  newNames?: ReadonlySet<string>;
  onOpenNew?: (name: string) => void;
};

/** Новая разминка или заминка из ответа агента: название, упражнения по таймеру, секунды и порядок. */
export function NewRoutineCard({ label, pick, onRename, onSec, onMove, onRemove, onDrop, newNames, onOpenNew }: Props) {
  const word = label === 'Разминка' ? 'разминка' : 'заминка';
  const genitive = label === 'Разминка' ? 'разминки' : 'заминки';
  const accusative = label === 'Разминка' ? 'разминку' : 'заминку';
  return (
    <Card tone="surface" className={styles.root} aria-label={`Новая ${word}`}>
      <div className={styles.head}>
        <Text variant="h4" tag="h2">
          {label}
        </Text>
        <Badge tone="highlight">{`новая ${word}`}</Badge>
      </div>
      <TextInput label={`Название ${genitive}`} value={pick.title} maxLength={80} onChange={(e) => onRename(e.target.value)} />
      {pick.items.length === 0 ? (
        <Text variant="body-sm" color="slate">
          Нет упражнений
        </Text>
      ) : (
        <ol className={styles.list}>
          {pick.items.map((item, i) => {
            const isNew = newNames?.has(item.name) ?? false;
            // Одно упражнение может стоять в наборе дважды: ключ — позиция
            return (
              <li key={`${i}-${item.name}`} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.name}>
                    <Text variant="body">{item.name}</Text>
                    {item.sides && <Text variant="caption">на сторону</Text>}
                  </span>
                  {isNew && <Badge tone="highlight">новое</Badge>}
                  <IconButton bare icon="back" aria-label={`${item.name}: выше`} disabled={i === 0} onClick={() => onMove(i, -1)} className={styles.up} />
                  <IconButton bare icon="back" aria-label={`${item.name}: ниже`} disabled={i === pick.items.length - 1} onClick={() => onMove(i, 1)} className={styles.down} />
                  <IconButton bare icon="close" aria-label={`Убрать «${item.name}»`} onClick={() => onRemove(i)} />
                </div>
                {isNew && onOpenNew && (
                  <Button variant="secondary" compact aria-label={`Открыть «${item.name}»`} onClick={() => onOpenNew(item.name)} className={styles.open}>
                    Открыть
                  </Button>
                )}
                <ParamStepper label="Время" unit="с" mode="duration" step={5} min={5} max={600} value={item.sec} onChange={(v) => onSec(i, v)} />
              </li>
            );
          })}
        </ol>
      )}
      <Button variant="danger-text" compact onClick={onDrop} className={styles.drop}>
        {`Убрать ${accusative}`}
      </Button>
    </Card>
  );
}
