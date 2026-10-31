import type { Preview } from '@storybook/react-vite';
import '../web/src/tokens.css';
import '../web/src/base.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { date: /Date$/i } },
    viewport: {
      options: {
        phone: { name: 'Телефон 390×844', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        // Samsung Galaxy A15: 1080×2340 при DPR 2,8125
        a15: { name: 'Samsung A15 384×832', styles: { width: '384px', height: '832px' }, type: 'mobile' },
        tablet: { name: 'Планшет 768×1024', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        desktop: { name: 'Десктоп 1280×800', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
    backgrounds: {
      options: {
        canvas: { name: 'canvas', value: 'var(--canvas)' },
        surface: { name: 'surface', value: 'var(--surface)' },
      },
    },
    // Нарушения a11y — ошибки, а не предупреждения
    a11y: { test: 'error' },
    docs: { toc: true },
  },
  initialGlobals: {
    viewport: { value: 'phone', isRotated: false },
    backgrounds: { value: 'canvas' },
  },
  decorators: [
    // Экраны на всю высоту (bleed) показываем без отступа, иначе к 100dvh прибавляется 32 px и появляется прокрутка
    (Story, { parameters }) =>
      parameters.bleed ? (
        <Story />
      ) : (
        <div style={{ padding: 'var(--spacing-md)' }}>
          <Story />
        </div>
      ),
  ],
};

export default preview;
