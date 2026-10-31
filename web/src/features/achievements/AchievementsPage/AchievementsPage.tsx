import { useAchievements } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { AchievementsView } from '../AchievementsView/AchievementsView';

export function AchievementsPage() {
  const { data, error } = useAchievements();

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;
  return <AchievementsView data={data} />;
}
