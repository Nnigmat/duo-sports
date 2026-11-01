import { useId } from 'react';
import { Icon } from '../../../ui';
import { passwordRuleTexts, passwordRules, type PasswordRuleId } from '../auth';
import styles from './PasswordRules.module.css';

type Props = {
  next: string;
  current: string;
  /** После попытки сохранить невыполненные правила помечаются крестиком */
  submitted: boolean;
};

const order: PasswordRuleId[] = ['length', 'mix', 'differs'];

/** Блок «Требования к паролю»: у каждого правила знак и скрытая подпись «выполнено» или «не выполнено». */
export function PasswordRules({ next, current, submitted }: Props) {
  const titleId = useId();
  const rules = passwordRules(next, current);
  return (
    <aside aria-labelledby={titleId} className={styles.root}>
      <h3 id={titleId} className={styles.title}>
        Требования к паролю
      </h3>
      <ul className={styles.list}>
        {order.map((id) => {
          const met = rules[id];
          const state = met ? 'met' : submitted ? 'failed' : 'pending';
          return (
            <li key={id} className={styles.item}>
              <span className={styles.mark} data-state={state} aria-hidden="true">
                {state === 'met' && <Icon name="check" size={20} />}
                {state === 'failed' && <Icon name="close" size={20} />}
              </span>
              <span>
                {passwordRuleTexts[id]}
                <span className={styles.sr}>{met ? ' — выполнено' : ' — не выполнено'}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className={styles.tip}>Фраза из нескольких слов запоминается легче и надёжнее короткого набора символов.</p>
    </aside>
  );
}
