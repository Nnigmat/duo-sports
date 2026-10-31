import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAchievements } from '../../../data/hooks';
import { Skeleton, useMediaQuery } from '../../../shared';
import { AchievementsView } from '../AchievementsView/AchievementsView';
import type { CategoryFilter } from '../achievements';

export function AchievementsPage() {
  const { data, error } = useAchievements();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width: 1024px)');

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return (
    <AchievementsView
      data={data}
      filter={filter}
      onFilterChange={setFilter}
      onBack={() => navigate(-1)}
      layout={desktop ? 'desktop' : 'mobile'}
    />
  );
}
