import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../../shared/useMediaQuery';
import { Icon } from '../Icon/Icon';
import { Sheet } from '../Sheet/Sheet';
import { Text } from '../Text/Text';
import styles from './ExerciseThumb.module.css';

type Props = {
  name: string;
  /** Файл ролика из pickDemo; нет — заглушка */
  file?: string;
};

/** Превью ролика техники: первый кадр или «Нет видео». По нажатию ролик играет в панели. */
export function ExerciseThumb({ name, file }: Props) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const src = file && broken !== file ? `/api/demo/${file}` : undefined;
  // В окне выбора вся библиотека: кадр грузим, только когда строка рядом с экраном
  const ref = useRef<HTMLButtonElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near || !src) return;
    if (typeof IntersectionObserver === 'undefined') return setNear(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near, src]);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.thumb}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <span className={styles.srOnly}>{`Видео техники: ${name}`}</span>
        {src && !near ? (
          <Icon name="video" size={20} />
        ) : src ? (
          <video className={styles.frame} src={`${src}#t=0.1`} muted playsInline preload="metadata" aria-hidden onError={() => setBroken(file ?? null)} />
        ) : (
          <span className={styles.empty}>
            <Icon name="video" size={20} />
            <span>
              <span className={styles.srOnly}>, </span>Нет видео
            </span>
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={name}>
        {src ? (
          // Ролик зациклен и без звука; при reduced motion стоит на первом кадре
          <video className={styles.player} src={src} muted loop playsInline autoPlay={!still} controls={still} preload="metadata" aria-label={`Видео техники: ${name}`} onError={() => setBroken(file ?? null)} />
        ) : (
          <div className={styles.none}>
            <Icon name="video" />
            <Text variant="body-sm" color="slate">
              Видео техники не добавлено
            </Text>
          </div>
        )}
      </Sheet>
    </>
  );
}
