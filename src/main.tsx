import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppStateProvider } from './state/AppState.tsx'
import { AuthProvider } from './state/AuthState.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </AuthProvider>
  </StrictMode>,
)
