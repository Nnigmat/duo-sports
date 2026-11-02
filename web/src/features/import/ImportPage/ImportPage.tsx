import { useLocation, useNavigate } from 'react-router-dom';
import { useImport } from '../../../data/hooks';
import { Skeleton } from '../../../shared';
import { importActions } from '../api';
import { ImportFlow, type ImportLinks } from '../ImportFlow/ImportFlow';

const LINKS: ImportLinks = { import: '/import', format: '/import/format', workouts: '/', plan: '/plan', exercises: '/exercises' };

/** Вкладка «Импорт»: загрузка данных, адреса /import и /import/format. Состояние шагов живёт, пока открыт /import. */
export function ImportPage() {
  const { data, error } = useImport();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Skeleton height={320} />;

  return (
    <ImportFlow
      data={data}
      view={pathname.startsWith(LINKS.format) ? 'format' : 'flow'}
      links={LINKS}
      actions={importActions}
      onNavigate={(href) => navigate(href)}
      onCancel={() => navigate(LINKS.plan)}
      onCopy={(text) => {
        // Буфер обмена может быть закрыт (http, запрет): тогда кнопка просто ничего не копирует
        navigator.clipboard?.writeText(text).catch(() => undefined);
      }}
    />
  );
}
