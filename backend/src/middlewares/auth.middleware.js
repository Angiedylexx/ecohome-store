const jwt = require('jsonwebtoken');

// Extrae y valida el JWT del encabezado "Authorization: Bearer <token>".
// - Sin encabezado o formato inválido -> 401 Unauthorized.
// - Token presente pero inválido/expirado -> 403 Forbidden.
function authJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado: falta el token de acceso' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado: falta el token de acceso' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    req.user = decoded;
    next();
  });
}

// Middleware de autorización por rol. Debe usarse después de authJWT,
// ya que depende de req.user haber sido asignado.
function authorizeRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `Acceso denegado: se requiere el rol '${requiredRole}'`,
      });
    }
    next();
  };
}

module.exports = { authJWT, authorizeRole };
