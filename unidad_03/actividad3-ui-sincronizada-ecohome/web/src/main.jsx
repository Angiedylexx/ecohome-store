import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Nota: se omite <StrictMode> a propósito. En desarrollo, StrictMode monta,
// desmonta y vuelve a montar los componentes para detectar efectos
// impuros, lo que abriría y cerraría la conexión de Socket.IO dos veces
// al cargar el chat y generaría logs de conexión/desconexión confusos
// para la evidencia de esta actividad.
createRoot(document.getElementById('root')).render(<App />)
