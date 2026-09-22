const { verifyToken } = require("../auth/jwt");

// Extrae el token del handshake, ya sea de socket.handshake.auth.token
// (forma recomendada por socket.io-client) o del header Authorization
// como respaldo ("Bearer <token>").
function extractToken(socket) {
  const fromAuth = socket.handshake.auth && socket.handshake.auth.token;
  if (fromAuth) return fromAuth;

  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return null;
}

// Middleware de autenticación de Socket.IO: se ejecuta ANTES de que la
// conexión se establezca (io.use). Si el token falta, es inválido o
// expiró, se rechaza la conexión con next(error) y el cliente recibe
// el evento "connect_error".
function socketAuthMiddleware(socket, next) {
  const token = extractToken(socket);

  if (!token) {
    return next(new Error("Autenticación requerida: token no proporcionado"));
  }

  try {
    const payload = verifyToken(token);

    // Se asocia el usuario autenticado a la instancia del socket para
    // que el resto de los handlers (connection, new-message, disconnect)
    // puedan usarlo sin volver a verificar el token.
    socket.user = {
      id: payload.user_id,
      username: payload.username,
    };

    next();
  } catch (err) {
    next(new Error("Token inválido o expirado"));
  }
}

module.exports = socketAuthMiddleware;
