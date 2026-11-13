import { useState, type FormEvent } from 'react';
import { Button, EmptyState, Icon, IconButton, Notice, Sheet, Text, TextInput } from '../../../ui';
import { sameName, totalText, usageText } from '../equipment';
import type { EquipmentItem } from '../../../../../shared/types';
import styles from './EquipmentListView.module.css';

type Props = {
  items: EquipmentItem[];
  /** Ошибка отказа бросается наружу: панель остаётся открытой и показывает сообщение */
  onAdd: (name: string) => Promise<void>;
  layout?: 'mobile' | 'desktop';
};

/** Список инвентаря и панель «Новый инвентарь». */
export function EquipmentListView({ items, onAdd, layout = 'mobile' }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const desktop = layout === 'desktop';

  const change = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName('');
      setError(null);
    }
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return setError('Введите название');
    if (items.some((i) => sameName(i.name, value))) return setError('Такой инвентарь уже есть');
    setBusy(true);
    try {
      await onAdd(value);
      change(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.titles}>
          {desktop && <Text variant="eyebrow">Справочник</Text>}
          <Text variant="h2" tag="h1">Инвентарь</Text>
          <Text variant="body-sm" color="steel">{totalText(items.length)}</Text>
        </div>
        {desktop ? (
          <Button icon="plus" onClick={() => change(true)}>Новый инвентарь</Button>
        ) : (
          <IconButton icon="plus" aria-label="Новый инвентарь" onClick={() => change(true)} />
        )}
      </header>

      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((i) => (
            <li key={i.id} className={styles.row}>
              <span className={styles.tile}>
                <Icon name="dumbbell" />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{i.name}</span>
                <Text variant="caption">{usageText(i.exercises)}</Text>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Инвентаря пока нет" description="Добавьте первый, чтобы указывать его у упражнений." action={<Button onClick={() => change(true)}>Добавить</Button>} />
      )}

      <Sheet open={open} onOpenChange={change} title="Новый инвентарь">
        <form className={styles.form} onSubmit={submit} noValidate>
          <TextInput label="Название" placeholder="Например, эспандер" value={name} maxLength={60} autoComplete="off" onChange={(e) => { setName(e.target.value); setError(null); }} error={error ?? undefined} />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" fullWidth loading={busy}>Добавить</Button>
        </form>
      </Sheet>
    </div>
  );
}
