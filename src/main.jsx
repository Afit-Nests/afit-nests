import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.88rem',
            fontWeight: 600,
            borderRadius: '12px',
            padding: '0.8rem 1.2rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          },
          success: {
            style: {
              background: 'rgba(22,163,74,0.08)',
              border: '1px solid rgba(22,163,74,0.2)',
              color: '#16A34A',
            },
            iconTheme: { primary: '#16A34A', secondary: 'white' },
          },
          error: {
            style: {
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)',
              color: '#DC2626',
            },
            iconTheme: { primary: '#DC2626', secondary: 'white' },
          },
        }}
      />
    </AuthProvider>
  </StrictMode>,
)