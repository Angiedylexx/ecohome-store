// URL del backend unificado (REST + Socket.IO): catálogo, /users/me/stats y chat.
// Se puede sobreescribir con VITE_API_URL (p. ej. la URL pública en Render).
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4500";
