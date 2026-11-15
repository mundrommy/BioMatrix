import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: the service worker (public/sw.js) saves the app on this device after the first
// online visit, so it opens again with no internet. Only in the production build: in `npm run dev`
// a cached copy would hide your code changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Not supported here (e.g. a private window): the app still works online. */
    });
  });
}
