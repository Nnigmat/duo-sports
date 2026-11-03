import { Button, EmptyState } from '../../ui';

/** Показывается вместо экрана, если React упал. Ошибка уже ушла в Sentry. */
export function ErrorFallback() {
  return (
    <EmptyState
      title="Что-то пошло не так"
      description="Мы уже знаем об ошибке. Перезагрузите страницу."
      action={<Button onClick={() => window.location.reload()}>Перезагрузить</Button>}
    />
  );
}
