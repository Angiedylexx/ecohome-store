const express = require("express");
const bcrypt = require("bcryptjs");
const { createUser, findUserByUsername } = require("../models/userModel");
const { signToken } = require("../auth/jwt");

const router = express.Router();

// POST /api/register — crea un usuario nuevo con password hasheado.
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "username y password son requeridos" });
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ username, passwordHash });

    return res.status(201).json({ message: "Usuario creado", user });
  } catch (err) {
    console.error("Error en /register:", err.message);
    return res.status(500).json({ error: "Error del servidor" });
  }
});

// POST /api/login — valida credenciales y devuelve un JWT firmado
// con { user_id, username } en el payload.
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "username y password son requeridos" });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Login exitoso",
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("Error en /login:", err.message);
    return res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
