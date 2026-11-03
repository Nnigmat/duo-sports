import { useState } from 'react';
import type { Gender } from '../../../../../shared/types';
import { apiChangePassword, apiSetGender } from '../../../app/auth/authApi';
import { useAuth } from '../../../app/auth/AuthProvider';
import { Card, SegmentedControl, Text } from '../../../ui';
import styles from './ProfilePage.module.css';
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
      <Card tone="canvas" role="region" aria-labelledby="profile-gender" className={styles.gender}>
        <Text variant="h4" tag="h2" id="profile-gender">
          Пол
        </Text>
        <Text variant="body-sm" color="slate">
          От него зависит, какой ролик с техникой вы увидите
        </Text>
        <SegmentedControl<Gender | ''>
          label="Пол"
          options={[
            { value: 'male', label: 'Мужской' },
            { value: 'female', label: 'Женский' },
          ]}
          value={user.gender ?? ''}
          onChange={async (g) => {
            if (g === '') return;
            setError(null);
            try {
              await apiSetGender(g);
              await auth.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Не удалось сохранить пол');
            }
          }}
        />
      </Card>
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
