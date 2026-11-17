import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '../../shared';
import { useAuth } from './AuthProvider';
import { isAdmin } from './roles';

/** Страницы админа: остальных отправляет на «/». Вложенные маршруты стоят под RequireAuth. */
export function RequireAdmin() {
  const auth = useAuth();
  if (auth.status !== 'in') return <Skeleton height={320} />;
  return isAdmin(auth.user.role) ? <Outlet /> : <Navigate to="/" replace />;
}
