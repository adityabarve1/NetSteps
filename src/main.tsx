import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { AuthProvider } from '@/auth/AuthProvider';
import { ProgressProvider } from '@/progress/ProgressProvider';
import '@/theme/tokens.css';
import '@/theme/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </AuthProvider>
  </StrictMode>,
);
