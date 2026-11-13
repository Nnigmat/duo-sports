import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DISPLAY_NAME_MAX, MAX_SOUND_VOLUME, MAX_START_DELAY_SEC, SOUND_STYLES, type Gender, type SoundStyle } from '../../../../../shared/types';
import { apiChangePassword, apiSetDisplayName, apiSetGender, apiSetSound, apiSetStartDelay } from '../../../app/auth/authApi';
import { useAuth } from '../../../app/auth/AuthProvider';
import { Button, Card, ParamStepper, SegmentedControl, Text, TextInput } from '../../../ui';
import { createBeeper } from '../../workout/sound/beeper';
import { STYLE_LABELS } from '../../workout/sound/styles';
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
  // Пока идёт сохранение, показываем выбранное значение, а не то, что ещё не вернулось с сервера
  const [delayDraft, setDelayDraft] = useState<number | null>(null);
  const [soundDraft, setSoundDraft] = useState<{ style: SoundStyle; volume: number } | null>(null);
  // Пробный сигнал: контекст создаётся по нажатию «Проверить», закрывается при уходе со страницы
  const [beeper] = useState(createBeeper);
  const previewTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(previewTimer.current);
    beeper.close();
  }, [beeper]);
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

  async function saveDelay(sec: number) {
    setError(null);
    setDelayDraft(sec);
    try {
      await apiSetStartDelay(sec);
      await auth.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить отсчёт');
    } finally {
      setDelayDraft(null);
    }
  }

  const sound = soundDraft ?? { style: user.soundStyle, volume: user.soundVolume };

  async function saveSound(next: { style: SoundStyle; volume: number }) {
    setError(null);
    setSoundDraft(next);
    try {
      await apiSetSound(next.style, next.volume);
      await auth.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить звук');
    } finally {
      setSoundDraft(null);
    }
  }

  function previewSound() {
    window.clearTimeout(previewTimer.current);
    beeper.unlock();
    beeper.configure(sound);
    beeper.play('short');
    previewTimer.current = window.setTimeout(() => beeper.play('long'), 600);
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <Card tone="canvas" role="region" aria-labelledby="profile-name" className={styles.card}>
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
      <Card tone="canvas" role="region" aria-labelledby="profile-gender" className={styles.card}>
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
      <Card tone="canvas" role="region" aria-labelledby="profile-delay" className={styles.card}>
        <Text variant="h4" tag="h2" id="profile-delay">
          Запись видео
        </Text>
        <Text variant="body-sm" color="slate">
          Пауза после «Старт», чтобы поставить телефон. 0 — сразу.
        </Text>
        <ParamStepper label="Отсчёт" unit="с" value={delayDraft ?? user.startDelaySec} min={0} max={MAX_START_DELAY_SEC} onChange={(sec) => void saveDelay(sec)} />
      </Card>
      <Card tone="canvas" role="region" aria-labelledby="profile-sound" className={styles.card}>
        <Text variant="h4" tag="h2" id="profile-sound">
          Звук
        </Text>
        <Text variant="body-sm" color="slate">
          Сигналы таймера и отсчёта в тренировке. Громкость 0 % выключает звук.
        </Text>
        <SegmentedControl<SoundStyle>
          label="Стиль сигналов"
          options={SOUND_STYLES.map((value) => ({ value, label: STYLE_LABELS[value] }))}
          value={sound.style}
          onChange={(style) => void saveSound({ ...sound, style })}
        />
        <ParamStepper label="Громкость" unit="%" value={sound.volume} min={0} max={MAX_SOUND_VOLUME} step={10} integer onChange={(volume) => void saveSound({ ...sound, volume })} />
        <Button type="button" variant="secondary" onClick={previewSound} disabled={sound.volume === 0}>
          Проверить
        </Button>
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
