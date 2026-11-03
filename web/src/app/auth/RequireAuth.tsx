import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from '../../shared';
import { useAuth } from './AuthProvider';

/** Пускает только вошедших; остальных отправляет на /login и запоминает, куда они шли. */
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') return <Skeleton height={320} />;
  if (auth.status === 'out') {
    return <Navigate to="/login" replace state={auth.manual ? undefined : { from: location.pathname }} />;
  }
  return <Outlet />;
}
