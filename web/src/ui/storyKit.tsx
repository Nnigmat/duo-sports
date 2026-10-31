import type { ReactNode } from 'react';

// Только для историй: подпись + ряд вариантов.
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
      <span style={{ fontSize: 'var(--micro-uppercase-size)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--steel)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>{children}</div>
    </div>
  );
}

export function Stack({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>{children}</div>;
}

export const ARTIFACT = 'https://claude.ai/artifact/Wnztq6UfPkEDmDPQZhrgyR';
