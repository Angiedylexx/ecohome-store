import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'

// Nota: se omite <StrictMode> a propósito. En desarrollo, StrictMode monta,
// desmonta y vuelve a montar los componentes para detectar efectos impuros, lo
// que abriría y cerraría la conexión de Socket.IO dos veces y generaría logs
// de conexión/desconexión confusos.
createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
)
