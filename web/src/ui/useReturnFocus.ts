import { useLayoutEffect, useRef } from 'react';

/**
 * Radix возвращает фокус только на свой Dialog.Trigger. Наши Sheet и Dialog управляются снаружи (open),
 * поэтому запоминаем элемент, который был в фокусе до открытия, и возвращаем фокус на него при закрытии.
 */
export function useReturnFocus(open: boolean) {
  const target = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (open) target.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [open]);

  return (event: Event) => {
    event.preventDefault();
    target.current?.focus();
  };
}
