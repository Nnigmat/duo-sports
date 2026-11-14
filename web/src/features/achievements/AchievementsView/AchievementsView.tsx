import type { Gender } from '../../../../../shared/types';
import type { AchievementsData } from '../../../data/types';
import { Chip, ChipGroup, IconButton, ListRow, Text, TopBar } from '../../../ui';
import { AchievementsSummary } from '../AchievementsSummary/AchievementsSummary';
import { CategorySection } from '../CategorySection/CategorySection';
import { categoryTabs, visibleCategories, type CategoryFilter } from '../achievements';
import styles from './AchievementsView.module.css';

type Props = {
  data: AchievementsData;
  filter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
  /** Стрелка «назад к прогрессу» в шапке (только mobile) */
  onBack?: () => void;
  layout?: 'mobile' | 'desktop';
  gender?: Gender;
  /** Вход в «Замеры» над достижениями; без него строки нет */
  onOpenMeasurements?: () => void;
};

/** Экран «Достижения»: сводка, фильтр по разделам и карточки. */
export function AchievementsView({ data, filter, onFilterChange, onBack, layout = 'mobile', gender, onOpenMeasurements }: Props) {
  const desktop = layout === 'desktop';
  const sections = visibleCategories(data.categories, filter);

  return (
    <div className={styles.root} data-layout={layout}>
      {!desktop && onBack && (
        <TopBar start={<IconButton bare icon="back" aria-label="Назад к прогрессу" onClick={onBack} />} />
      )}
      <header className={styles.header}>
        {desktop && <Text variant="eyebrow">Прогресс</Text>}
        <Text variant={desktop ? 'display' : 'h1'} tag="h1" className={styles.title}>Достижения</Text>
      </header>

      {onOpenMeasurements && (
        <ListRow icon="bars" title="Замеры" subtitle="Вес и обхваты, изменения по месяцам" onClick={onOpenMeasurements} />
      )}

      <AchievementsSummary categories={data.categories} layout={layout} gender={gender} />

      <ChipGroup label="Категории" scroll={!desktop}>
        {categoryTabs(data.categories).map((t) => (
          <Chip key={t.id} pressed={filter === t.id} count={t.count} onClick={() => onFilterChange(t.id)}>
            {t.name}
          </Chip>
        ))}
      </ChipGroup>

      {sections.map((c) => (
        <CategorySection key={c.id} category={c} layout={layout} />
      ))}
    </div>
  );
}
