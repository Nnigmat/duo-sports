import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  /** Ссылка или кнопка справа */
  action?: ReactNode;
};

export function SectionHeader({ id, title, action }: Props) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <h2 id={id} style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 500 }}>
        {title}
      </h2>
      {action}
    </header>
  );
}
