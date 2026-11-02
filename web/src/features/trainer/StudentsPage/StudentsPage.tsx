import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAthletes } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { toIso } from '../../plan/plan';
import type { AthleteFilter } from '../students';
import { StudentsView } from '../StudentsView/StudentsView';

const SEARCH_DELAY_MS = 250;

/** /trainer — список учеников. Фильтр и поиск считает сервер, поэтому поиск уходит с небольшой задержкой. */
export function StudentsPage() {
  const [filter, setFilter] = useState<AthleteFilter>('all');
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSent(query), SEARCH_DELAY_MS);
    return () => clearTimeout(id);
  }, [query]);
  const { data, error } = useAthletes(filter, sent);
  const navigate = useNavigate();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={480} />;
  return (
    <StudentsView
      today={toIso(new Date())}
      athletes={data.athletes}
      counts={data.counts}
      filter={filter}
      onFilterChange={setFilter}
      query={query}
      onQueryChange={setQuery}
      athleteHref={(id) => `/trainer/athletes/${id}`}
      onOpenAthlete={(id) => navigate(`/trainer/athletes/${id}`)}
    />
  );
}
