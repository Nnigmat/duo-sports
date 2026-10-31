import { icons, type IconName } from '../Icon/icons';

type Props = {
  name: IconName;
  size?: 20 | 24;
  className?: string;
};

/** Декоративная иконка: смысл всегда несёт подпись или aria-label у родителя. */
export function Icon({ name, size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {icons[name]}
    </svg>
  );
}
