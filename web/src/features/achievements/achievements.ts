import type { Achievement, AchievementCategory } from '../../data/types';
import { groupDigits } from '../../shared/format';

/** Чистая логика экрана «Достижения»: подписи уровней, цели, счётчики разделов. */

const NBSP = '\u00a0';

type Tier = Achievement['tier'];

const NAME = ['Нет', 'Бронза', 'Серебро', 'Золото'] as const;
const GENITIVE = ['', 'бронзы', 'серебра', 'золота'] as const;
const LEVEL = ['отсутствует', 'начальный', 'средний', 'полный'] as const;

export function tierName(tier: Tier): string {
  return NAME[tier];
}

/** «Серебро · средний · 12 окт» · «Нет · уровень отсутствует» · «Условие скрыто» */
export function tierLine(a: Achievement): string {
  if (a.secret) return 'Условие скрыто';
  if (a.tier === 0) return 'Нет · уровень отсутствует';
  const date = a.earnedDates[a.tier - 1];
  return [NAME[a.tier], LEVEL[a.tier], date].filter(Boolean).join(' · ');
}

export type NextGoal = {
  tier: 1 | 2 | 3;
  /** «серебро» */
  tierWord: string;
  /** 0–100 */
  pct: number;
  /** «Цель: Серебро · 8 нед» */
  chipText: string;
  /** «До серебра» */
  untilText: string;
  /** «5 из 8 нед» */
  progressText: string;
  /** Для скринридера: «Без пропусков, до серебра» */
  barLabel: string;
};

/** Число с единицей: «80 кг», «5 000 кг», «31» без единицы */
function amount(n: number, unit?: string): string {
  return unit ? `${groupDigits(n)}${NBSP}${unit}` : groupDigits(n);
}

/** Следующий уровень; null у секретных и когда получены все три. */
export function nextGoal(a: Achievement): NextGoal | null {
  if (a.secret || a.tier >= 3 || !a.levels || !a.levelLabels) return null;
  const tier = (a.tier + 1) as 1 | 2 | 3;
  const index = a.tier as 0 | 1 | 2;
  const target = a.levels[index];
  const current = a.current ?? 0;
  return {
    tier,
    tierWord: NAME[tier].toLowerCase(),
    pct: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    chipText: `Цель: ${NAME[tier]} · ${a.levelLabels[index]}`,
    untilText: `До ${GENITIVE[tier]}`,
    progressText: `${groupDigits(current)} из ${amount(target, a.unit)}`,
    barLabel: `${a.name}, до ${GENITIVE[tier]}`,
  };
}

export function isMaxed(a: Achievement): boolean {
  return !a.secret && a.tier >= 3;
}

export type Count = { got: number; total: number };

/** Секретные не считаются: у них нет известных уровней. */
export function categoryCount(c: AchievementCategory): Count {
  const open = c.items.filter((a) => !a.secret);
  return { got: open.reduce((sum, a) => sum + a.tier, 0), total: open.length * 3 };
}

export function totalCount(categories: AchievementCategory[]): Count {
  return categories.reduce<Count>(
    (acc, c) => {
      const n = categoryCount(c);
      return { got: acc.got + n.got, total: acc.total + n.total };
    },
    { got: 0, total: 0 },
  );
}

export type CategoryFilter = 'all' | string;

export type CategoryTab = { id: CategoryFilter; name: string; count: string };

/** Чипы: «Все 13/33», затем разделы. */
export function categoryTabs(categories: AchievementCategory[]): CategoryTab[] {
  const t = totalCount(categories);
  return [
    { id: 'all', name: 'Все', count: `${t.got}/${t.total}` },
    ...categories.map((c) => {
      const n = categoryCount(c);
      return { id: c.id, name: c.name, count: `${n.got}/${n.total}` };
    }),
  ];
}

export function visibleCategories(categories: AchievementCategory[], filter: CategoryFilter): AchievementCategory[] {
  return filter === 'all' ? categories : categories.filter((c) => c.id === filter);
}

export type Closest = { achievement: Achievement; goal: NextGoal };

/** Достижение, которому меньше всего осталось до следующего уровня. При равенстве — первое. */
export function closestGoal(categories: AchievementCategory[]): Closest | null {
  let best: Closest | null = null;
  for (const c of categories) {
    for (const a of c.items) {
      const goal = nextGoal(a);
      if (goal && (!best || goal.pct > best.goal.pct)) best = { achievement: a, goal };
    }
  }
  return best;
}
