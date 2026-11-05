import { useState } from 'react';
import { Button } from '../../../ui';
import { joinCode, splitCode } from '../format';
import styles from './CodeBlock.module.css';

type Props = {
  lines: string[];
  /** Что в блоке — для скринридера */
  label: string;
  /** Номера строк слева */
  numbered?: boolean;
  /** С onCopy появляется кнопка «Скопировать пример»; вызывается с готовым текстом */
  onCopy?: (text: string) => void;
};

/** Блок YAML: комментарии приглушены, строки по желанию пронумерованы. Фокусируется, чтобы прокручиваться с клавиатуры. */
export function CodeBlock({ lines, label, numbered, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const parsed = splitCode(lines);
  return (
    <div className={styles.root}>
      {onCopy && (
        <Button
          variant="secondary"
          compact
          icon={copied ? 'check' : 'copy'}
          className={styles.copy}
          onClick={() => {
            onCopy(joinCode(lines));
            setCopied(true);
          }}
        >
          {copied ? 'Скопировано' : 'Скопировать пример'}
        </Button>
      )}
      <pre className={styles.pre} role="region" tabIndex={0} aria-label={label} data-numbered={numbered || undefined}>
        <code>
          {parsed.map((l) => (
            <span key={l.n} className={styles.line}>
              {l.code}
              {l.comment && <span className={styles.comment}>{l.code ? '  ' : ''}{l.comment}</span>}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
