import { API_URL } from "./config";

// Cliente REST contra los endpoints del backend (los mismos que usa Flutter).
// Los errores llevan `status` para que la UI cierre sesión en 401/403.
async function request(path, { method = "GET", token, body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`No se pudo conectar con el servidor (${API_URL})`);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.error || (data?.errors && data.errors.join(". "));
    const err = new Error(detail || `Error ${res.status} en la petición`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// POST /auth/login -> { token }
export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } });

// POST /auth/signup -> usuario creado (rol "cliente" por defecto)
export const register = (username, email, password) =>
  request("/auth/signup", { method: "POST", body: { username, email, password } });

// GET /products (público) -> [{ id, name, price, creator: { id, username } | null, ... }]
export const getProducts = (token) => request("/products", { token });

// POST /products (JWT + rol admin). El creador lo toma el servidor del token.
export const createProduct = (token, { name, price }) =>
  request("/products", { method: "POST", token, body: { name, price } });

// GET /users/me/stats -> { username, count }
export const getStats = (token) => request("/users/me/stats", { token });
