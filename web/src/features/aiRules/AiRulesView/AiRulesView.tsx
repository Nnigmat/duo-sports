import type { FormEvent } from 'react';
import type { AiRules } from '../../../../../shared/types';
import { Button, Notice, Text, TextArea } from '../../../ui';
import { formatDateTime } from '../../../shared/format';
import styles from './AiRulesView.module.css';

type Props = {
  rules: AiRules;
  text: string;
  saving: boolean;
  error: string | null;
  saved: boolean;
  onText: (t: string) => void;
  onSave: () => void;
};

/** Текст правил для агента, собирающего тренировки: одно поле и «Сохранить». */
export function AiRulesView({ rules, text, saving, error, saved, onText, onSave }: Props) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave();
  };
  const edited = rules.updatedAt ? `Изменено ${formatDateTime(rules.updatedAt)}${rules.updatedBy ? ` · ${rules.updatedBy}` : ''}` : null;
  return (
    <form className={styles.root} onSubmit={submit}>
      <header className={styles.header}>
        <Text variant="h2" tag="h1">Правила агента</Text>
        <Text variant="body-sm" color="slate">
          Агент учитывает их в каждой тренировке, которую собирает. Пишите коротко, по одному правилу в строке.
        </Text>
      </header>
      <TextArea label="Правила для агента" rows={10} value={text} onChange={(e) => onText(e.target.value)} className={styles.area} />
      {edited && <Text variant="caption" className={styles.meta}>{edited}</Text>}
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Сохранено</Notice>}
      <Button type="submit" loading={saving} disabled={text === rules.text}>
        Сохранить
      </Button>
    </form>
  );
}
