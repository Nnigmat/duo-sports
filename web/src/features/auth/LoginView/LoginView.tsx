import { useId, useState, type FormEvent } from 'react';
import { Button, Checkbox, Notice, PasswordInput, Text, TextInput } from '../../../ui';
import { Chibi } from '../../workout/chibi/Chibi';
import { loginErrors } from '../auth';
import styles from './LoginView.module.css';

export type LoginValues = { email: string; password: string; remember: boolean };

type Props = {
  /** wrongPassword — сервер отклонил пару email и пароль; locked — слишком много попыток, вход закрыт */
  status?: 'wrongPassword' | 'locked';
  /** Вызывается только когда поля заполнены верно */
  onSubmit: (values: LoginValues) => void;
  /** Если не задана, ссылка «Забыли пароль?» не показывается */
  forgotHref?: string;
  /** Подставить значения, например при повторной попытке */
  initial?: Partial<Pick<LoginValues, 'email' | 'password'>>;
  layout?: 'mobile' | 'desktop';
};

/** Экран «Вход»: на десктопе слева приветствие с персонажем, справа форма; на телефоне только форма. */
export function LoginView({ status, onSubmit, forgotHref, initial, layout = 'mobile' }: Props) {
  const desktop = layout === 'desktop';
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  // Сообщение о неверном пароле гаснет, как только человек начинает править пароль
  const [passwordEdited, setPasswordEdited] = useState(false);
  const headingId = useId();

  const errors = submitted ? loginErrors(email, password) : {};
  const locked = status === 'locked';
  const wrong = status === 'wrongPassword' && !passwordEdited;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    setSubmitted(true);
    if (Object.keys(loginErrors(email, password)).length === 0) onSubmit({ email, password, remember });
  }

  const forgot = forgotHref && (
    <a href={forgotHref} className={styles.forgot}>
      Забыли пароль?
    </a>
  );

  const form = (
    <main className={styles.formWrap}>
      <div className={styles.formInner}>
        {!desktop && (
          <div className={styles.brandRow}>
            <span className={styles.brand}>Workout Tracker</span>
            <span className={styles.disc} aria-hidden="true">
              <Chibi pose="wave" size={64} />
            </span>
          </div>
        )}
        <div className={styles.intro}>
          <Text variant="h1" tag="h1" id={headingId}>
            Вход
          </Text>
          <Text variant="body" color="slate" tag="p">
            Рады видеть снова. Войдите, чтобы продолжить тренировки.
          </Text>
        </div>

        {wrong && (
          <Notice tone="error">
            Неверный email или пароль. Проверьте раскладку и Caps Lock{desktop ? ' и попробуйте ещё раз' : ''}.
          </Notice>
        )}
        {locked && (
          <Notice icon="warning" className={styles.locked}>
            Слишком много попыток входа. Попробуйте снова через 15 минут.
          </Notice>
        )}

        <form onSubmit={submit} noValidate aria-labelledby={headingId} className={styles.form}>
          <TextInput
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            placeholder="name@mail.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <PasswordInput
            label="Пароль"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordEdited(true);
            }}
            error={errors.password}
            labelAside={desktop ? forgot : undefined}
          />
          {!desktop && (
            <div className={styles.extras}>
              <Checkbox label="Запомнить меня" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {forgot}
            </div>
          )}
          <Button type="submit" fullWidth disabled={locked}>
            Войти
          </Button>
        </form>
      </div>
    </main>
  );

  if (!desktop) {
    return (
      <div className={styles.root} data-layout="mobile">
        {form}
      </div>
    );
  }

  return (
    <div className={styles.root} data-layout="desktop">
      <aside className={styles.aside}>
        <span className={styles.brand}>Workout Tracker</span>
        <div className={styles.hello}>
          <span className={styles.bigDisc} aria-hidden="true">
            <Chibi pose="wave" size={220} />
          </span>
          <Text variant="display" tag="h2" className={styles.slogan}>
            Каждый подход на счету
          </Text>
          <Text variant="body" color="slate" tag="p" className={styles.lead}>
            Персонажи показывают технику — вы отмечаете подходы.
          </Text>
        </div>
        <span className={styles.copy}>© 2026 Workout Tracker</span>
      </aside>
      {form}
    </div>
  );
}
