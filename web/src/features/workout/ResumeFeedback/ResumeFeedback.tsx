import { useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../app/auth/AuthProvider';
import { pendingFeedback } from '../draftStorage';

/**
 * Обёртка главной страницы: если прохождение остановилось на «Обратной связи», при открытии приложения
 * сразу ведёт на него, сколько бы времени ни прошло. Проверка один раз при открытии.
 */
export function ResumeFeedback({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.status === 'in' ? auth.user.id : null;
  const [path] = useState(() => (userId === null ? null : pendingFeedback(userId)));
  return path ? <Navigate to={path} replace /> : children;
}
