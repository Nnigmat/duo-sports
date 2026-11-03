import { Navigate, useParams } from 'react-router-dom';
import { ImportScreen, type ImportLinks } from '../../import';
import { importActionsFor } from '../../import/api';
import { athleteBase } from '../api';

/** /trainer/athletes/:id/import — тот же импорт, что у спортсмена: тренировки и план попадают ученику. */
export function AthleteImportPage() {
  const { id } = useParams();
  if (!id || !/^\d+$/.test(id)) return <Navigate to="/trainer" replace />;
  const base = `/trainer/athletes/${id}`;
  const links: ImportLinks = { import: `${base}/import`, format: `${base}/import/format`, workouts: base, plan: `${base}/plan`, exercises: '/exercises' };
  const api = athleteBase(Number(id));
  return <ImportScreen links={links} actions={importActionsFor(api)} apiBase={api} />;
}
