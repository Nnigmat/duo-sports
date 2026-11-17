import { useMemo, useState, type FormEvent } from 'react';
import { DRAFT_TEXT_MAX } from '../../../../../shared/aiDraft';
import type { LibraryEntry, RoutineKind } from '../../../../../shared/types';
import { formatDateTime } from '../../../shared/format';
import { Button, ChoiceCard, IconButton, Notice, SearchField, Text, TextArea, TextInput } from '../../../ui';
import type { ParseContext, ParseIssue } from '../../import/parse';
import { canBuild, type BuilderInput, type RoutineChoice } from '../types';
import styles from './BuilderInputView.module.css';

type Props = {
  dateLabel: string;
  input: BuilderInput;
  library: LibraryEntry[];
  routines: ParseContext['routines'];
  building: boolean;
  error: string | null;
  /** Сборка выключена на сервере (503): ссылка на импорт за этот день */
  unavailableHref: string | null;
  /** Ошибки разбора после второй попытки */
  issues: ParseIssue[];
  /** Когда сохранён восстановленный черновик; null — открыли с чистого листа */
  restoredAt: number | null;
  onInput: (i: BuilderInput) => void;
  onBuild: () => void;
  onReset: () => void;
};

/** Счётчик символов показываем, когда до предела осталось меньше 400 */
const COUNTER_FROM = DRAFT_TEXT_MAX - 400;
const MAX_FOUND = 6;

/** Ввод для агента: разминка, основная часть (текст и упражнения из библиотеки), заминка. */
export function BuilderInputView({ dateLabel, input, library, routines, building, error, unavailableHref, issues, restoredAt, onInput, onBuild, onReset }: Props) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canBuild(input) && !building) onBuild();
  };
  const set = (patch: Partial<BuilderInput>) => onInput({ ...input, ...patch });

  return (
    <form className={styles.root} onSubmit={submit} noValidate>
      <header className={styles.header}>
        <Text variant="h2" tag="h1">
          Новая тренировка
        </Text>
        <Text variant="body-sm" color="slate" className={styles.num}>
          {dateLabel}
        </Text>
      </header>

      {restoredAt !== null && (
        <Notice
          tone="info"
          action={
            <Button variant="ghost" compact onClick={onReset}>
              Начать заново
            </Button>
          }
        >
          <span className={styles.num}>{`Восстановлен черновик от ${formatDateTime(new Date(restoredAt).toISOString())}`}</span>
        </Notice>
      )}

      <TextInput label="Название" hint="Необязательно — придумает агент" value={input.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} />

      <RoutineGroup kind="warmup" choice={input.warmup} routines={routines} onChange={(warmup) => set({ warmup })} />

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Основная часть</legend>
        <LimitedText label="Что делаем" hint="Упражнения, подходы, вес, суперсеты — как написали бы ученику" rows={5} value={input.main.text} onChange={(text) => set({ main: { ...input.main, text } })} />
        <LibraryPicker library={library} picked={input.main.picked} onChange={(picked) => set({ main: { ...input.main, picked } })} />
      </fieldset>

      <RoutineGroup kind="cooldown" choice={input.cooldown} routines={routines} onChange={(cooldown) => set({ cooldown })} />

      {unavailableHref && (
        <Notice
          tone="error"
          action={
            <Button variant="secondary" compact href={unavailableHref}>
              Открыть импорт
            </Button>
          }
        >
          Сборка недоступна. Тренировку можно добавить через импорт.
        </Notice>
      )}
      {error && !unavailableHref && <Notice tone="error">{error}</Notice>}
      {issues.length > 0 && (
        <Notice tone="warn">
          Агент дважды собрал тренировку с ошибками. Уточните описание и соберите ещё раз.
          <ul className={styles.issues}>
            {issues.map((i) => (
              <li key={`${i.line ?? 0}${i.message}`}>
                {i.message}
                {i.hint ? `. ${i.hint}` : ''}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <Button type="submit" fullWidth loading={building} disabled={!canBuild(input)} className={styles.submit}>
        Собрать тренировку
      </Button>
    </form>
  );
}

/** Поле с пределом DRAFT_TEXT_MAX и счётчиком у предела */
function LimitedText({ label, hint, rows, value, onChange }: { label: string; hint?: string; rows: number; value: string; onChange: (v: string) => void }) {
  const over = value.length > DRAFT_TEXT_MAX;
  return (
    <div className={styles.limited}>
      <TextArea label={label} hint={hint} rows={rows} value={value} error={over ? `Не длиннее ${DRAFT_TEXT_MAX} символов` : undefined} onChange={(e) => onChange(e.target.value)} />
      {value.length >= COUNTER_FROM && (
        <Text variant="caption" className={styles.counter}>
          {`${value.length} / ${DRAFT_TEXT_MAX}`}
        </Text>
      )}
    </div>
  );
}

const WORDS: Record<RoutineKind, { legend: string; none: string; ask: string }> = {
  warmup: { legend: 'Разминка', none: 'Без разминки', ask: 'Какая разминка' },
  cooldown: { legend: 'Заминка', none: 'Без заминки', ask: 'Какая заминка' },
};

/** Радиогруппа: готовые этого вида, «Описать свою» (с полем), «Без …» */
function RoutineGroup({ kind, choice, routines, onChange }: { kind: RoutineKind; choice: RoutineChoice; routines: ParseContext['routines']; onChange: (c: RoutineChoice) => void }) {
  const w = WORDS[kind];
  const value = choice.kind === 'library' ? `lib:${choice.slug}` : choice.kind;
  const pick = (v: string) => {
    if (v === 'none') onChange({ kind: 'none' });
    else if (v === 'text') onChange({ kind: 'text', text: choice.kind === 'text' ? choice.text : '' });
    else onChange({ kind: 'library', slug: v.slice(4) });
  };
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{w.legend}</legend>
      <div className={styles.choices}>
        {routines
          .filter((r) => r.kind === kind)
          .map((r) => (
            <ChoiceCard key={r.id} name={`${kind}-choice`} value={`lib:${r.id}`} title={r.title} checked={value === `lib:${r.id}`} onChange={pick} />
          ))}
        <ChoiceCard name={`${kind}-choice`} value="text" title="Описать свою" checked={value === 'text'} onChange={pick} />
        <ChoiceCard name={`${kind}-choice`} value="none" title={w.none} checked={value === 'none'} onChange={pick} />
      </div>
      {choice.kind === 'text' && <LimitedText label={w.ask} hint="Агент соберёт упражнения на время" rows={2} value={choice.text} onChange={(text) => onChange({ kind: 'text', text })} />}
    </fieldset>
  );
}

/** Поиск по библиотеке и выбранные упражнения чипами с удалением */
function LibraryPicker({ library, picked, onChange }: { library: LibraryEntry[]; picked: string[]; onChange: (p: string[]) => void }) {
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(library.map((l) => [l.id, l])), [library]);
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return library.filter((l) => !picked.includes(l.id) && (l.name.toLowerCase().includes(needle) || l.aliases.some((a) => a.toLowerCase().includes(needle)))).slice(0, MAX_FOUND);
  }, [library, picked, q]);
  return (
    <div className={styles.picker}>
      <SearchField label="Из библиотеки" placeholder="Название упражнения" value={q} onValueChange={setQ} />
      {q.trim() !== '' && found.length === 0 && (
        <Text variant="body-sm" color="slate">
          Не нашлось — опишите упражнение в тексте, агент добавит его как новое.
        </Text>
      )}
      {found.length > 0 && (
        <ul className={styles.found}>
          {found.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className={styles.pick}
                onClick={() => {
                  onChange([...picked, l.id]);
                  setQ('');
                }}
              >
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked.length > 0 && (
        <ul className={styles.chips} aria-label="Выбраны из библиотеки">
          {picked.map((id) => {
            const name = byId.get(id)?.name ?? id;
            return (
              <li key={id} className={styles.chip}>
                <span>{name}</span>
                <IconButton bare icon="close" aria-label={`Убрать «${name}»`} onClick={() => onChange(picked.filter((p) => p !== id))} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
