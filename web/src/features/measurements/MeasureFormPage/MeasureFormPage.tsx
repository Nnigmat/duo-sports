import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMeasurement } from '../../../data/api';
import { useMeasurements } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { toIso } from '../../plan/plan';
import { MeasureFormView } from '../MeasureFormView/MeasureFormView';

/** /progress/measurements/new — ввод замера за сегодня; после сохранения возвращает к прогрессу. */
export function MeasureFormPage() {
  const navigate = useNavigate();
  const { data, error } = useMeasurements();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;
  return (
    <MeasureFormView
      today={toIso(new Date())}
      entries={data.entries}
      saving={saving}
      error={saveError}
      onBack={() => navigate('/progress/measurements')}
      onSave={(entry) => {
        if (saving) return;
        setSaving(true);
        setSaveError(undefined);
        saveMeasurement(entry).then(
          () => navigate('/progress/measurements'),
          (e: unknown) => {
            setSaving(false);
            setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить замер');
          },
        );
      }}
    />
  );
}
