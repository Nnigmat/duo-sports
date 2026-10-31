import type { AchievementCategory } from '../../../data/types';
import { Text } from '../../../ui';
import { AchievementCard } from '../AchievementCard/AchievementCard';
import { categoryCount } from '../achievements';
import styles from './CategorySection.module.css';

type Props = {
  category: AchievementCategory;
  layout?: 'mobile' | 'desktop';
};

/** Раздел достижений: название, счётчик уровней, пояснение и карточки. */
export function CategorySection({ category, layout = 'mobile' }: Props) {
  const { got, total } = categoryCount(category);
  const desktop = layout === 'desktop';
  const titleId = `ach-cat-${category.id}`;

  return (
    <section aria-labelledby={titleId} className={styles.section} data-layout={layout}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <Text variant={desktop ? 'h4' : 'h5'} tag="h2" id={titleId}>{category.name}</Text>
          <Text variant="caption">{desktop ? `${got} из ${total} уровней` : `${got} из ${total}`}</Text>
        </div>
        {category.note && <Text variant="caption" color="slate" tag="p" className={styles.note}>{category.note}</Text>}
      </div>
      <ul className={styles.list}>
        {category.items.map((a) => (
          <li key={a.id} className={styles.item}>
            <AchievementCard achievement={a} layout={layout} />
          </li>
        ))}
      </ul>
    </section>
  );
}
