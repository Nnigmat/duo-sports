import { useEffect, useState } from 'react';
import type { AiRules } from '../../../../../shared/types';
import { Notice } from '../../../ui';
import { Skeleton } from '../../../shared';
import { fetchAiRules, saveAiRules } from '../api';
import { AiRulesView } from '../AiRulesView/AiRulesView';

/** Страница «Правила агента»: маршрут открыт только админу. */
export function AiRulesPage() {
  const [rules, setRules] = useState<AiRules | null>(null);
  const [text, setText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAiRules().then(
      (r) => {
        setRules(r);
        setText(r.text);
      },
      (e: unknown) => setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки'),
    );
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const r = await saveAiRules(text);
      setRules(r);
      setText(r.text);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!rules) return <Skeleton height={320} />;
  return (
    <AiRulesView
      rules={rules}
      text={text}
      saving={saving}
      error={error}
      saved={saved}
      onText={(t) => {
        setText(t);
        setSaved(false);
      }}
      onSave={() => void save()}
    />
  );
}
