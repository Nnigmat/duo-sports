import styles from './DemoVideo.module.css';

type Props = {
  src: string;
  /** Файл не загрузился или не играет: экран возвращает статичного чибика */
  onFail: () => void;
  className?: string;
};

/** Ролик чибика с упражнением: без звука, по кругу, сам. Декоративный: смысл несёт облачко над ним. */
export function DemoVideo({ src, onFail, className }: Props) {
  return (
    <video
      key={src}
      className={[styles.root, className].filter(Boolean).join(' ')}
      src={src}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onError={onFail}
    />
  );
}
