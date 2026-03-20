import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Register Service Worker for PWA
registerSW({ immediate: true });

// Clean up old manual cache to prevent stale assets
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      if (name === 'finance-tracker-v1') {
        caches.delete(name);
      }
    }
  });
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
