// URL del backend unificado (REST + Socket.IO): catálogo, /users/me/stats y chat.
// Se puede sobreescribir con VITE_API_URL (p. ej. la URL pública en Render).
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4500";

// Muestra los accesos rápidos con las cuentas de prueba (db/init.sql) en el
// login. Solo en desarrollo, o si se activa a propósito con VITE_SHOW_DEMO=true.
export const SHOW_DEMO_ACCOUNTS =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === "true";
