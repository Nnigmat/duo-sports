import { type FormEvent, useState } from 'react';
import { copyTitle } from '../../../../../shared/routines';
import type { RoutineSummary } from '../../../../../shared/types';
import { ActionList, Button, Notice, Sheet, TextInput } from '../../../ui';
import { KIND_LABEL, LIMITS } from '../routines';
import styles from './RoutineActionsSheet.module.css';

type Props = {
  /** Разминка, для которой открыта панель; null — панель закрыта */
  routine: RoutineSummary | null;
  /** Названия того же вида: по ним показывается имя будущей копии */
  taken: string[];
  onClose: () => void;
  /** Ошибка — Error с текстом для пользователя; панель закрывается только при успехе */
  onCopy: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
};

const message = (e: unknown) => (e instanceof Error ? e.message : 'Не получилось');

/** Быстрые действия из списка: копия и переименование, не открывая разминку. */
export function RoutineActionsSheet({ routine, ...rest }: Props) {
  // key сбрасывает панель и черновик названия при открытии для другой разминки
  return routine ? <Panel key={routine.id} routine={routine} {...rest} /> : null;
}

function Panel({ routine, taken, onClose, onCopy, onRename }: Props & { routine: RoutineSummary }) {
  const [panel, setPanel] = useState<'menu' | 'rename'>('menu');
  const [title, setTitle] = useState(routine.title);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const one = KIND_LABEL[routine.kind].one;
  const trimmed = title.trim();
  const titleError = trimmed.length > LIMITS.title ? `Название не длиннее ${LIMITS.title} знаков` : undefined;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || titleError || busy) return;
    if (trimmed === routine.title) return onClose();
    void run(() => onRename(routine.id, trimmed));
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={one}
      title={panel === 'menu' ? routine.title : 'Переименовать'}
      onBack={panel === 'rename' ? () => { setPanel('menu'); setError(null); } : undefined}
    >
      {panel === 'menu' ? (
        <>
          <ActionList
            items={[
              { id: 'copy', icon: 'copy', title: 'Сделать копию', description: copyTitle(routine.title, taken, LIMITS.title), onSelect: () => !busy && void run(() => onCopy(routine.id)) },
              { id: 'rename', icon: 'pencil', title: 'Переименовать', onSelect: () => !busy && setPanel('rename') },
            ]}
          />
          {busy && <p role="status" className={styles.status}>Копируем…</p>}
          {error && <Notice tone="error">{error}</Notice>}
        </>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <TextInput
            label="Название"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            error={titleError ?? error ?? undefined}
            maxLength={LIMITS.title + 20}
            autoFocus
          />
          <Button type="submit" fullWidth loading={busy} disabled={!trimmed || !!titleError}>
            Сохранить
          </Button>
        </form>
      )}
    </Sheet>
  );
}
