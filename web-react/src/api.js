import { API_URL } from "./config";

// Cliente REST contra los endpoints del backend (los mismos que usa Flutter).
// Los errores llevan `status` para que la UI cierre sesión cuando el token no sirve.
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

// El backend responde 401 sin token y 403 tanto con token inválido/expirado
// como cuando falta el rol admin: solo el primer 403 exige volver a iniciar sesión.
export const isAuthError = (err) =>
  err?.status === 401 || (err?.status === 403 && /token/i.test(err.message));

// POST /auth/login -> { token }. Acepta correo o nombre de usuario.
export const login = (identifier, password) =>
  request("/auth/login", {
    method: "POST",
    body: identifier.includes("@")
      ? { email: identifier, password }
      : { username: identifier, password },
  });

// POST /auth/signup -> usuario creado (siempre con rol "cliente")
export const register = (username, email, password) =>
  request("/auth/signup", { method: "POST", body: { username, email, password } });

// GET /products (JWT) -> [{ id, name, price, creator: { id, username } | null, ... }]
export const getProducts = (token) => request("/products", { token });

// POST /products (JWT + rol admin). El creador lo toma el servidor del token.
export const createProduct = (token, { name, price }) =>
  request("/products", { method: "POST", token, body: { name, price } });

// PUT /products/:id (JWT + rol admin). El creador original no cambia.
export const updateProduct = (token, id, { name, price }) =>
  request(`/products/${id}`, { method: "PUT", token, body: { name, price } });

// DELETE /products/:id (JWT + rol admin)
export const deleteProduct = (token, id) =>
  request(`/products/${id}`, { method: "DELETE", token });

// GET /users/me/stats -> { username, count }
export const getStats = (token) => request("/users/me/stats", { token });
