import styles from './ExerciseNameLink.module.css';

type Props = {
  name: string;
  /** Адрес карточки упражнения; без него (или если упражнения нет в библиотеке) название остаётся текстом */
  href?: string;
  /** Переход без перезагрузки страницы; клик с модификатором работает как у обычной ссылки */
  onOpen?: (href: string) => void;
  className?: string;
};

/** Название упражнения: ссылка на его карточку или обычный текст. */
export function ExerciseNameLink({ name, href, onOpen, className }: Props) {
  if (!href) return <span className={className}>{name}</span>;
  return (
    <a
      className={[styles.link, className].filter(Boolean).join(' ')}
      href={href}
      onClick={(ev) => {
        if (!onOpen || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        onOpen(href);
      }}
    >
      {name}
    </a>
  );
}
