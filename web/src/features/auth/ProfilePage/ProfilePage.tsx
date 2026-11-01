import { useState } from 'react';
import { apiChangePassword } from '../../../app/auth/authApi';
import { useAuth } from '../../../app/auth/AuthProvider';
import { ChangePasswordView } from '../ChangePasswordView/ChangePasswordView';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function ProfilePage() {
  const auth = useAuth();
  const [status, setStatus] = useState<'wrongCurrent' | 'saved' | undefined>();
  const [error, setError] = useState<string | null>(null);
  if (auth.status !== 'in') return null;
  const { user } = auth;

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <ChangePasswordView
        email={user.email}
        lastChanged={user.passwordChangedAt ? formatDate(user.passwordChangedAt) : 'пароль не менялся'}
        status={status}
        onSubmit={async ({ current, next, logoutOthers }) => {
          setError(null);
          setStatus(undefined);
          try {
            const result = await apiChangePassword(current, next, logoutOthers);
            setStatus(result);
            if (result === 'saved') await auth.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось сменить пароль');
          }
        }}
        onLogout={() => void auth.signOut()}
      />
    </>
  );
}
