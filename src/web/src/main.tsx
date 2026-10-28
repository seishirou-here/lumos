import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';
import { initTheme } from './lib/theme';

// Keep the store in sync with the pre-paint script in index.html.
initTheme();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Lumos: root element #root was not found.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
