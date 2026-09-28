const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const SALT_ROUNDS = 10;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthController = {
  async signup(req, res) {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email y password son obligatorios' });
      }
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({
          error: 'El username debe tener entre 3 y 50 caracteres (letras, números, ".", "_" o "-")',
        });
      }
      if (!EMAIL_RE.test(email) || email.length > 150) {
        return res.status(400).json({ error: 'El email no tiene un formato válido' });
      }
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // El rol NO se toma del body: cualquiera podría registrarse como admin.
      // Las cuentas admin se crean desde la base de datos (ver db/init.sql).
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await UserModel.create({ username, email, passwordHash });

      res.status(201).json(newUser);
    } catch (error) {
      // Violación de restricción UNIQUE (username o email ya registrados).
      if (error.code === '23505') {
        return res.status(409).json({ error: 'El username o el email ya están registrados' });
      }

      console.error('Error en signup:', error);
      res.status(500).json({ error: 'Error al registrar el usuario' });
    }
  },

  // Acepta { email, password } o { username, password }.
  async login(req, res) {
    try {
      const { email, username, password } = req.body;
      const identifier = String(email || username || '').trim();

      if (!identifier || !password) {
        return res.status(400).json({ error: 'email (o username) y password son obligatorios' });
      }

      const user = await UserModel.findByLogin(identifier);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const passwordMatches = await bcrypt.compare(String(password), user.password_hash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const payload = { id: user.id, username: user.username, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ token });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  },
};

module.exports = AuthController;
