import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiLogin } from '../../../app/auth/authApi';
import { useAuth } from '../../../app/auth/AuthProvider';
import { useMediaQuery } from '../../../shared';
import { LoginView } from '../LoginView/LoginView';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const desktop = useMediaQuery('(min-width: 900px)');
  const [status, setStatus] = useState<'wrongPassword' | 'locked' | undefined>();
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'in') return <Navigate to={from} replace />;

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <LoginView
        layout={desktop ? 'desktop' : 'mobile'}
        status={status}
        onSubmit={async ({ email, password }) => {
          setError(null);
          setStatus(undefined);
          try {
            const res = await apiLogin(email, password);
            if ('error' in res) return setStatus(res.error === 'locked' ? 'locked' : 'wrongPassword');
            auth.signedIn(res);
            navigate(from, { replace: true });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось войти');
          }
        }}
      />
    </>
  );
}
