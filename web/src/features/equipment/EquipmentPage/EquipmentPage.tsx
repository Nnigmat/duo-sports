import { useCallback, useEffect, useState } from 'react';
import type { EquipmentItem } from '../../../../../shared/types';
import { Notice } from '../../../ui';
import { Skeleton, useMediaQuery } from '../../../shared';
import { createEquipment, fetchEquipment } from '../api';
import { EquipmentListView } from '../EquipmentListView/EquipmentListView';

/** Вкладка «Инвентарь»: загрузка и добавление. Маршрут открыт тренеру и админу. */
export function EquipmentPage() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [items, setItems] = useState<EquipmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return fetchEquipment().then(setItems, (e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  /** Ошибка летит в панель: она остаётся открытой. После добавления список читается заново, чтобы порядок совпал с серверным. */
  async function add(name: string) {
    await createEquipment(name);
    await load();
  }

  if (error && !items) return <Notice tone="error">{error}</Notice>;
  if (!items) return <Skeleton height={320} />;
  return <EquipmentListView items={items} onAdd={add} layout={desktop ? 'desktop' : 'mobile'} />;
}
