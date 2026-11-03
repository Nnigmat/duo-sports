import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useImport } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { importActions, type ImportActions } from '../api';
import { ImportFlow, type ImportLinks } from '../ImportFlow/ImportFlow';
import { newWorkoutYaml } from '../import';

const LINKS: ImportLinks = { import: '/import', format: '/import/format', workouts: '/', plan: '/plan', exercises: '/exercises' };

/** Вкладка «Импорт»: загрузка данных, адреса /import и /import/format. Состояние шагов живёт, пока открыт /import. */
export function ImportPage() {
  return <ImportScreen links={LINKS} actions={importActions} />;
}

/**
 * Поток импорта для заданных адресов и запросов. apiBase — откуда читать библиотеку и куда писать:
 * у спортсмена свой аккаунт, у тренера аккаунт ученика.
 */
export function ImportScreen({ links, actions, apiBase }: { links: ImportLinks; actions: ImportActions; apiBase?: string }) {
  const { data, error } = useImport(apiBase);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // ?date=… — «Создать тренировку» в плане: поле сразу заполнено шаблоном на этот день
  const [search] = useSearchParams();
  const date = search.get('date');
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;

  return (
    <ImportFlow
      data={data}
      view={pathname.startsWith(links.format) ? 'format' : 'flow'}
      links={links}
      actions={actions}
      onNavigate={(href) => navigate(href)}
      initialText={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? newWorkoutYaml(date) : undefined}
      onCopy={(text) => {
        // Буфер обмена может быть закрыт (http, запрет): тогда кнопка просто ничего не копирует
        navigator.clipboard?.writeText(text).catch(() => undefined);
      }}
    />
  );
}
