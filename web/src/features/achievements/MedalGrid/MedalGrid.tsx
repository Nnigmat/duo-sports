import type { Achievement } from '../../../data/types';
import { SectionHeader, Skeleton } from '../../../shared';

type Props = {
  items: Achievement[];
};

export function MedalGrid({ items: _items }: Props) {
  return (
    <section aria-labelledby="ach-title">
      <SectionHeader id="ach-title" title="Достижения" />
      <Skeleton height={240} />
    </section>
  );
}
