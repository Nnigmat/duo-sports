import type { CSSProperties } from 'react';
import tokens from '../../../design/tokens.json';
import { Icon } from '../ui/Icon/Icon';
import { icons, type IconName } from '../ui/Icon/icons';

// Блоки для страницы Foundations: всё берётся из design/tokens.json, ничего не переписано руками.

type Token = { name: string; value: string; usage: string };

const mono: CSSProperties = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 'var(--caption-size)' };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--spacing-md)' };

export function Swatches() {
  const list = tokens.color.tokens as Token[];
  return (
    <div style={grid}>
      {list.map((t) => (
        <div key={t.name} style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-lg)', overflow: 'hidden' }}>
          <div style={{ height: 56, background: `var(--${t.name})`, borderBottom: '1px solid var(--hairline)' }} />
          <div style={{ padding: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong style={{ fontSize: 'var(--body-sm-size)' }}>{t.name}</strong>
            <span style={mono}>--{t.name}</span>
            <span style={mono}>{t.value}</span>
            <span style={{ fontSize: 'var(--caption-size)', color: 'var(--slate)' }}>{t.usage}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type Kind = 'radius' | 'shadow' | 'spacing' | 'size';

function sample(kind: Kind, t: Token) {
  const box: CSSProperties = { width: 56, height: 56, background: 'var(--surface)', border: '1px solid var(--hairline-strong)' };
  if (kind === 'radius') return <div style={{ ...box, borderRadius: `var(--${t.name})` }} />;
  if (kind === 'shadow') return <div style={{ ...box, border: '1px solid var(--hairline)', background: 'var(--canvas)', borderRadius: 'var(--rounded-md)', boxShadow: `var(--${t.name})` }} />;
  if (kind === 'spacing') return <div style={{ height: 16, width: `var(--${t.name})`, maxWidth: 160, background: 'var(--accent-300)' }} />;
  return <div style={{ height: 16, width: `min(var(--${t.name}), 160px)`, background: 'var(--accent-300)' }} />;
}

export function Table({ kind }: { kind: Kind }) {
  const list = tokens[kind].tokens as Token[];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {list.map((t) => (
        <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 'var(--spacing-md)', alignItems: 'center', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ padding: 'var(--spacing-xxs)' }}>{sample(kind, t)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <strong style={{ fontSize: 'var(--body-sm-size)' }}>
              {t.name} <span style={{ ...mono, fontWeight: 400 }}>--{t.name}: {t.value}</span>
            </strong>
            <span style={{ fontSize: 'var(--caption-size)', color: 'var(--slate)' }}>{t.usage}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type TypeStyle = { name: string; fontSize: string; lineHeight: number; fontWeight: number; letterSpacing?: string; sample: string; usage: string };

export function TypeStyles() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {tokens.type.groups.map((g) => (
        <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <strong>{g.name}</strong> <span style={{ color: 'var(--slate)', fontSize: 'var(--body-sm-size)' }}>{g.note}</span>
          </div>
          {(g.styles as TypeStyle[]).map((s) => (
            <div key={s.name} style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: 'var(--spacing-md)' }}>
              <div
                style={{
                  fontFamily: `var(--font-${g.family})`,
                  fontSize: `var(--${s.name}-size)`,
                  lineHeight: `var(--${s.name}-line)`,
                  fontWeight: `var(--${s.name}-weight)` as unknown as number,
                  letterSpacing: `var(--${s.name}-tracking)`,
                  textTransform: s.name === 'micro-uppercase' ? 'uppercase' : undefined,
                }}
              >
                {s.sample}
              </div>
              <div style={mono}>
                --{s.name}-size: {s.fontSize} · -line: {s.lineHeight} · -weight: {s.fontWeight} · -tracking: {s.letterSpacing ?? '0'}
              </div>
              <div style={{ fontSize: 'var(--caption-size)', color: 'var(--slate)' }}>{s.usage}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function IconGrid() {
  const names = Object.keys(icons) as IconName[];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--spacing-sm)' }}>
      {names.map((n) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-xs)', padding: 'var(--spacing-sm)', border: '1px solid var(--hairline)', borderRadius: 'var(--rounded-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <Icon name={n} size={24} />
            <Icon name={n} size={20} />
          </div>
          <span style={mono}>{n}</span>
        </div>
      ))}
    </div>
  );
}
