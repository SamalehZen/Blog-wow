import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/app/App';
import '@/styles/globals.css';

/**
 * Les polices d'origine (Geist Sans, Fraunces) sont declarees dans une feuille
 * servie par l'application. On l'injecte a l'execution sur une URL absolue :
 * un <link> relatif casserait sur les routes profondes (/v2/lab/mow).
 */
function chargerPolices() {
  const href = import.meta.env.BASE_URL + 'fonts.css';
  if (document.querySelector('link[data-polices]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.polices = 'true';
  document.head.appendChild(link);
}
chargerPolices();

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
