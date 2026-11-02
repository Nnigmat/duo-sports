import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '../../shared';
import { useAuth } from './AuthProvider';
import { canEnterTrainer } from './roles';

/** Кабинет тренера: ученика отправляет на «/». Вложенные маршруты стоят под RequireAuth. */
export function RequireTrainer() {
  const auth = useAuth();
  if (auth.status !== 'in') return <Skeleton height={320} />;
  return canEnterTrainer(auth.user.role) ? <Outlet /> : <Navigate to="/" replace />;
}

/** «/» у тренера и админа ведёт в кабинет тренера; ученик остаётся на своём экране */
export function HomeRedirect({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.status === 'in' && canEnterTrainer(auth.user.role)) return <Navigate to="/trainer" replace />;
  return <>{children}</>;
}
