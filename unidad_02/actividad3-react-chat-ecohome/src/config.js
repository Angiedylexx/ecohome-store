// URL del backend de la Actividad 2 (Express + Socket.IO + JWT + PostgreSQL).
// Se puede sobreescribir con una variable de entorno de Vite si el backend
// corre en otra máquina/puerto: VITE_API_URL=http://localhost:4001
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";
