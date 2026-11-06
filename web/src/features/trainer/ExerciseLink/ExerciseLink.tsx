import styles from './ExerciseLink.module.css';

type Props = {
  name: string;
  /** Адрес карточки упражнения; без него (или если упражнения нет в библиотеке) название остаётся текстом */
  href?: string;
  /** Переход без перезагрузки страницы; клик с модификатором работает как у обычной ссылки */
  onOpen?: (href: string) => void;
};

/** Название упражнения в карточке ученика: ссылка на карточку упражнения или обычный заголовок. */
export function ExerciseLink({ name, href, onOpen }: Props) {
  if (!href) return <h3 className={styles.name}>{name}</h3>;
  return (
    <h3 className={styles.name}>
      <a
        className={styles.link}
        href={href}
        onClick={(ev) => {
          if (!onOpen || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
          ev.preventDefault();
          onOpen(href);
        }}
      >
        {name}
      </a>
    </h3>
  );
}
