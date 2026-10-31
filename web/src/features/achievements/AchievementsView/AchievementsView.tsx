import type { AchievementsData } from '../../../data/types';
import { MedalGrid } from '../MedalGrid/MedalGrid';

type Props = {
  data: AchievementsData;
};

export function AchievementsView({ data }: Props) {
  return (
    <>
      <h1>Достижения</h1>
      <MedalGrid items={data.items} />
    </>
  );
}
