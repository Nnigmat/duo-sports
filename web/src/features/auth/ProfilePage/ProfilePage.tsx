import { useState, type FormEvent } from 'react';
import { DISPLAY_NAME_MAX, type Gender } from '../../../../../shared/types';
import { apiChangePassword, apiSetDisplayName, apiSetGender } from '../../../app/auth/authApi';
import { useAuth } from '../../../app/auth/AuthProvider';
import { Button, Card, SegmentedControl, Text, TextInput } from '../../../ui';
import styles from './ProfilePage.module.css';
import { ChangePasswordView } from '../ChangePasswordView/ChangePasswordView';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function ProfilePage() {
  const auth = useAuth();
  const [status, setStatus] = useState<'wrongCurrent' | 'saved' | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  if (auth.status !== 'in') return null;
  const { user } = auth;
  const savedName = user.displayName ?? '';
  const draft = name ?? savedName;
  const dirty = draft.trim() !== savedName;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNameSaved(false);
    try {
      await apiSetDisplayName(draft);
      await auth.refresh();
      setName(null);
      setNameSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить имя');
    }
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <Card tone="canvas" role="region" aria-labelledby="profile-name" className={styles.gender}>
        <Text variant="h4" tag="h2" id="profile-name">
          Имя
        </Text>
        <form className={styles.nameForm} onSubmit={saveName}>
          <TextInput
            label="Как вас называть"
            hint="Необязательно, до 40 символов"
            value={draft}
            maxLength={DISPLAY_NAME_MAX}
            autoComplete="nickname"
            onChange={(e) => {
              setName(e.target.value);
              setNameSaved(false);
            }}
          />
          <Button type="submit" disabled={!dirty}>
            Сохранить
          </Button>
          {nameSaved && <Text variant="body-sm" color="slate" role="status">Имя сохранено</Text>}
        </form>
      </Card>
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
        displayName={user.displayName}
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
