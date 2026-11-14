import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMeasurement } from '../../../data/api';
import { useMeasurements } from '../../../data/hooks';
import { useAuth } from '../../../app/auth/AuthProvider';
import { Skeleton, useMediaQuery } from '../../../shared';
import { toIso } from '../../plan/plan';
import { MeasureFormView } from '../MeasureFormView/MeasureFormView';

/** /progress/measurements/new — ввод замера за сегодня; после сохранения возвращает к прогрессу. */
export function MeasureFormPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const { data, error } = useMeasurements();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  // Если форму открыли по прямой ссылке, назад идти некуда: заменяем запись, а не добавляем новую
  const leave = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/progress/measurements', { replace: true });
  };

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;
  return (
    <MeasureFormView
      today={toIso(new Date())}
      entries={data.entries}
      saving={saving}
      layout={desktop ? 'desktop' : 'mobile'}
      gender={auth.status === 'in' ? auth.user.gender : undefined}
      error={saveError}
      onBack={leave}
      onSave={(entry) => {
        if (saving) return;
        setSaving(true);
        setSaveError(undefined);
        saveMeasurement(entry).then(
          leave,
          (e: unknown) => {
            setSaving(false);
            setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить замер');
          },
        );
      }}
    />
  );
}
