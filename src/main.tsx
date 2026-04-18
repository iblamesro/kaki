import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import { AuthProvider } from './lib/auth'
import App from './App.tsx'

// Enregistre le Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    // Écoute les messages du SW (Web Share Target)
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'SHARE_TARGET' && e.data.url) {
        window.dispatchEvent(new CustomEvent('kaki:share', { detail: { url: e.data.url } }))
      }
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
