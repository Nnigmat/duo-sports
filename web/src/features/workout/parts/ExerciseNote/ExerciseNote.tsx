import { useId, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../../../../ui/cx';
import styles from './ExerciseNote.module.css';

type Props = {
  /** Заметка к упражнению */
  text: string;
  className?: string;
};

/** Заметка под названием упражнения: две строки, «Ещё» только если текст не помещается. */
export function ExerciseNote({ text, className }: Props) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);

  // Меряем, пока текст обрезан; раскрытый текст не обрезан, «Ещё» тогда остаётся как есть
  // biome-ignore lint/correctness/useExhaustiveDependencies: text не читается в теле, но новый текст надо измерить заново
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!open) setOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, open]);

  return (
    <div className={cx(styles.root, className)}>
      <p ref={ref} id={id} className={cx(styles.text, !open && styles.clamped)}>
        {text}
      </p>
      {(overflow || open) && (
        <button type="button" className={styles.more} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Ещё'}
        </button>
      )}
    </div>
  );
}
