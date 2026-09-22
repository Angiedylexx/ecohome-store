const jwt = require("jsonwebtoken");
const config = require("../config");

// Genera un JWT cuya carga útil (payload) contiene el user_id y el
// username del usuario autenticado.
function signToken(user) {
  return jwt.sign(
    { user_id: user.id, username: user.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// Verifica un JWT. Lanza un error si es inválido o expiró.
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { signToken, verifyToken };
