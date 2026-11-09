import { useState } from 'react';
import { ListRow } from '../../../../ui/ListRow/ListRow';
import { SearchField } from '../../../../ui/SearchField/SearchField';
import { Sheet } from '../../../../ui/Sheet/Sheet';
import { Text } from '../../../../ui/Text/Text';
import { swapCandidates, type SwapOption } from '../../flow';
import styles from './SwapSheet.module.css';

type Props = {
  open: boolean;
  /** Крестик, Esc и тап на фон закрывают шторку, ничего не меняя */
  onOpenChange: (open: boolean) => void;
  /** Что заменяем: по нему сверху стоят упражнения на те же мышцы */
  currentId: string;
  currentName: string;
  library: SwapOption[];
  /** Выбрали замену; шторку закрывает вызывающий */
  onPick: (option: SwapOption) => void;
};

/** Шторка «Заменить упражнение»: сверху упражнения на те же мышцы, ниже остальные, сверху поиск. План тренера она не меняет. */
export function SwapSheet({ open, onOpenChange, currentId, currentName, library, onPick }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow="Заменить упражнение" title={currentName} tall>
      {/* Поиск сбрасывается при каждом открытии */}
      <SwapBody currentId={currentId} library={library} onPick={onPick} />
    </Sheet>
  );
}

function SwapBody({ currentId, library, onPick }: Pick<Props, 'currentId' | 'library' | 'onPick'>) {
  const [query, setQuery] = useState('');
  const { related, other } = swapCandidates(library, currentId, query);
  const empty = related.length + other.length === 0;
  return (
    <div className={styles.body}>
      <SearchField label="Поиск упражнения" placeholder="Найти упражнение" value={query} onValueChange={setQuery} />
      {empty && (
        <Text variant="body-sm" tag="p" color="steel" role="status">
          Ничего не найдено
        </Text>
      )}
      <Section title="Те же мышцы" items={related} onPick={onPick} />
      <Section title={related.length > 0 ? 'Остальные' : 'Все упражнения'} items={other} onPick={onPick} />
    </div>
  );
}

function Section({ title, items, onPick }: { title: string; items: SwapOption[]; onPick: (option: SwapOption) => void }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section}>
      <Text variant="eyebrow" tag="h3">
        {title}
      </Text>
      <ul className={styles.list}>
        {items.map((e) => (
          <li key={e.id}>
            <ListRow icon="dumbbell" title={e.name} subtitle={e.muscles.join(', ') || undefined} onClick={() => onPick(e)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
