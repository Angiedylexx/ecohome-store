const { verifyToken } = require("./jwt");

// Middleware de Express para proteger endpoints REST con el mismo
// JWT que se usa para autenticar el WebSocket.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = requireAuth;
