// Lee el payload de un JWT (sin verificar la firma: eso lo hace el servidor).
// El backend firma { id, username, role, iat, exp }.
export function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isExpired(claims) {
  return !claims || Boolean(claims.exp && claims.exp * 1000 <= Date.now());
}
