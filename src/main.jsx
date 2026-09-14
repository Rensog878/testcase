import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { Toaster } from 'sonner'
import './app.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <App />
          {/* Sonner: stacked, swipeable, accessible toasts. The storefront's
              js/toast.js uses the same palette so both halves of the site match. */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
            visibleToasts={3}
            gap={10}
            offset={16}
            mobileOffset={12}
            toastOptions={{ style: { fontFamily: 'inherit', borderRadius: '14px' } }}
          />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)

