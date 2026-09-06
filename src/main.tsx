import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FinancialPrivacyProvider } from './contexts/FinancialPrivacyContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FinancialPrivacyProvider>
          <App />
        </FinancialPrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

