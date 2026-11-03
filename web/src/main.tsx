import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorFallback } from './app/ErrorFallback/ErrorFallback';
import { initMonitoring, Sentry } from './monitoring';
import './tokens.css';
import './base.css';

initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?key=${__BUILD_ID__}`).catch(() => {});
  });
}
