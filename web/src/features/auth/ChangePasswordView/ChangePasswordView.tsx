import { useId, useState, type FormEvent } from 'react';
import { Button, Card, Checkbox, Notice, Text, TextInput } from '../../../ui';
import { changePasswordErrors, passwordStrength } from '../auth';
import { PasswordRules } from '../PasswordRules/PasswordRules';
import { PasswordStrength } from '../PasswordStrength/PasswordStrength';
import styles from './ChangePasswordView.module.css';

export type ChangePasswordValues = { current: string; next: string; logoutOthers: boolean };

type Props = {
  /** Например «12 августа 2026»; после смены — «только что» */
  lastChanged: string;
  email: string;
  /** wrongCurrent — сервер не принял текущий пароль; saved — пароль сменён */
  status?: 'wrongCurrent' | 'saved';
  /** Вызывается только когда все три поля заполнены верно */
  onSubmit: (values: ChangePasswordValues) => void;
  onLogout: () => void;
  /** Подставить значения, например при повторной попытке */
  initial?: Partial<Record<'current' | 'next' | 'confirm', string>>;
};

/** Блок «Смена пароля» и «Выход из аккаунта» на вкладке «Безопасность» профиля. */
export function ChangePasswordView({ lastChanged, email, status, onSubmit, onLogout, initial }: Props) {
  const [current, setCurrent] = useState(initial?.current ?? '');
  const [next, setNext] = useState(initial?.next ?? '');
  const [confirm, setConfirm] = useState(initial?.confirm ?? '');
  const [showPass, setShowPass] = useState(false);
  const [logoutOthers, setLogoutOthers] = useState(true);
  const [submitted, setSubmitted] = useState(status === 'wrongCurrent');
  const [currentEdited, setCurrentEdited] = useState(false);
  const [lastStatus, setLastStatus] = useState(status);
  const titleId = useId();
  const sessionTitleId = useId();

  // Когда родитель сообщил «сохранено», поля очищаются
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status === 'saved') {
      setCurrent('');
      setNext('');
      setConfirm('');
      setSubmitted(false);
    }
  }

  const saved = status === 'saved';
  const errors = submitted ? changePasswordErrors(current, next, confirm) : {};
  const currentError = errors.current ?? (status === 'wrongCurrent' && !currentEdited ? 'Неверный текущий пароль' : undefined);
  const type = showPass ? 'text' : 'password';
  const matches = !errors.confirm && confirm.length > 0 && confirm === next;

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(changePasswordErrors(current, next, confirm)).length === 0) {
      // Новая попытка: ответ сервера про текущий пароль снова актуален
      setCurrentEdited(false);
      onSubmit({ current, next, logoutOthers });
    }
  }

  function reset() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setSubmitted(false);
    setCurrentEdited(true);
  }

  return (
    <div className={styles.root}>
      <Card tone="canvas" className={styles.card} aria-labelledby={titleId} role="region">
        <div className={styles.head}>
          <Text variant="h4" tag="h2" id={titleId}>
            Смена пароля
          </Text>
          <Text variant="caption">Последнее изменение — {saved ? 'только что' : lastChanged}</Text>
        </div>

        {saved && (
          <Notice
            tone="success"
            action={
              <Button variant="secondary" compact onClick={onLogout}>
                Выйти и войти заново
              </Button>
            }
          >
            <b>Пароль изменён.</b>{' '}
            {logoutOthers
              ? `Мы отключили остальные устройства и отправили письмо на ${email}.`
              : `Мы отправили письмо-подтверждение на ${email}.`}
          </Notice>
        )}

        <div className={styles.cols}>
          <form onSubmit={submit} noValidate aria-labelledby={titleId} className={styles.form}>
            <TextInput
              label="Текущий пароль"
              type={type}
              autoComplete="current-password"
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value);
                setCurrentEdited(true);
              }}
              error={currentError}
            />
            <div className={styles.group}>
              <TextInput
                label="Новый пароль"
                type={type}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                error={errors.next}
              />
              <PasswordStrength strength={passwordStrength(next)} />
            </div>
            <div className={styles.group}>
              <TextInput
                label="Повторите новый пароль"
                type={type}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={errors.confirm}
                hint={matches ? 'Пароли совпадают' : undefined}
              />
            </div>
            <div className={styles.checks}>
              <Checkbox label="Показать пароли" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />
              <Checkbox
                label="Выйти на всех других устройствах"
                checked={logoutOthers}
                onChange={(e) => setLogoutOthers(e.target.checked)}
              />
            </div>
            <div className={styles.actions}>
              <Button type="submit">Сохранить пароль</Button>
              <Button variant="secondary" onClick={reset}>
                Отмена
              </Button>
            </div>
          </form>

          <PasswordRules next={next} current={current} submitted={submitted} />
        </div>
      </Card>

      <Card tone="canvas" className={styles.session} aria-labelledby={sessionTitleId} role="region">
        <div className={styles.head}>
          <Text variant="h4" tag="h2" id={sessionTitleId}>
            Выход из аккаунта
          </Text>
          <Text variant="body-sm" color="slate">
            Вы вошли как {email}
          </Text>
        </div>
        <Button variant="secondary" compact icon="logout" onClick={onLogout}>
          Выйти
        </Button>
      </Card>
    </div>
  );
}
